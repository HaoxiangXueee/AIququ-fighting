import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';
import { LlmService } from './llm.service';
import { GameService } from './game.service';
import { PlayerSide, RoundResult, Room, ALL_SIDES, SIDE_LABELS } from './types/game';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private roomService: RoomService,
    private llmService: LlmService,
    private gameService: GameService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const result = this.roomService.removePlayer(client.id);
    if (result) {
      client.leave(result.roomId);
      if (result.remainingSides.length > 0) {
        // Broadcast to remaining players
        this.server.to(result.roomId).emit('player_left', {
          remainingSides: result.remainingSides,
          remainingPlayers: result.remainingSides.length,
        });

        // If only 1 active player remains during a game, terminate
        if (result.remainingSides.length < 2) {
          this.server.to(result.roomId).emit('game_cancelled', {
            message: '对手已断开连接，游戏结束',
          });
        }
      }
    }
  }

  @SubscribeMessage('create_room')
  handleCreateRoom(
    client: Socket,
    payload: { nickname: string; maxPlayers: number; totalRounds: number },
  ) {
    const room = this.roomService.createRoom(
      client.id,
      payload.nickname,
      payload.maxPlayers || 2,
      payload.totalRounds || 3,
    );
    client.join(room.roomId);
    client.emit('room_created', {
      roomId: room.roomId,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { roomId: string; nickname: string }) {
    const result = this.roomService.joinRoom(payload.roomId, client.id, payload.nickname);
    if (!result) {
      client.emit('error', { message: '房间不存在、已满或游戏已开始' });
      return;
    }

    const { room, side } = result;
    client.join(room.roomId);

    // Build players list for all current players
    const playersList = room.players.map(p => ({
      side: p.side,
      nickname: p.nickname,
    }));

    const availableThemes = this.gameService.getAvailableThemes();

    // Notify all players in the room
    this.server.to(room.roomId).emit('player_joined', {
      players: playersList,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
      availableThemes,
      yourSide: side, // Only meaningful to the joining player
    });
  }

  @SubscribeMessage('start_game')
  handleStartGame(client: Socket) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    // Only host can start
    if (!this.roomService.isHost(room, client.id)) {
      client.emit('error', { message: '只有房主可以开始游戏' });
      return;
    }

    if (!this.roomService.canStartGame(room)) {
      client.emit('error', { message: '至少需要2名玩家才能开始' });
      return;
    }

    // Move to theme_select phase
    room.phase = 'theme_select';
    const availableThemes = this.gameService.getAvailableThemes();
    const playersList = room.players.map(p => ({
      side: p.side,
      nickname: p.nickname,
    }));

    this.server.to(room.roomId).emit('game_theme_select', {
      players: playersList,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
      availableThemes,
    });
  }

  @SubscribeMessage('select_theme')
  handleSelectTheme(client: Socket, payload: { themeId: string }) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    // Only host can select theme
    if (!this.roomService.isHost(room, client.id)) {
      client.emit('error', { message: '只有房主可以选择主题' });
      return;
    }

    if (room.phase !== 'theme_select') {
      client.emit('error', { message: '当前不在主题选择阶段' });
      return;
    }

    // Set theme and draw topics based on totalRounds
    room.themeId = payload.themeId;
    room.topics = this.gameService.drawTopics(payload.themeId, room.totalRounds);

    const themeName =
      this.gameService
        .getAvailableThemes()
        .find(t => t.id === payload.themeId)?.name || payload.themeId;

    const playersList = room.players.map(p => ({
      side: p.side,
      nickname: p.nickname,
    }));

    this.server.to(room.roomId).emit('game_start', {
      topics: room.topics,
      players: playersList,
      themeId: payload.themeId,
      themeName,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
    });
  }

  @SubscribeMessage('submit_answers')
  async handleSubmitAnswers(client: Socket, payload: { answers: string[] }) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    const side = this.roomService.getPlayerSide(room, client.id);
    if (!side) {
      client.emit('error', { message: '无法确定你的阵营' });
      return;
    }

    if (room.submitted[side]) {
      client.emit('error', { message: '你已经提交了答案' });
      return;
    }

    const success = this.roomService.submitAnswers(room, side, payload.answers);
    if (!success) {
      const validation = this.gameService.validateAnswers(payload.answers, room.totalRounds);
      client.emit('error', { message: validation.message || '答案格式不正确' });
      return;
    }

    // Notify all players that this player submitted
    const activeSides = this.roomService.getActiveSides(room);
    const submittedCount = this.roomService.getSubmittedCount(room);

    this.server.to(room.roomId).emit('player_submitted', {
      side,
      submittedCount,
      totalPlayers: activeSides.length,
    });

    // If all active players submitted, run evaluation
    if (this.roomService.allSubmitted(room)) {
      await this.runEvaluation(room);
    }
  }

  private async runEvaluation(room: Room) {
    const roundIndex = room.currentRound;
    const topic = room.topics[roundIndex];
    const activeSides = this.roomService.getActiveSides(room);
    const themeId = room.themeId!;

    // Build answers for active players
    const answers: Record<string, string> = {};
    for (const side of activeSides) {
      const answer = room.answers[side][roundIndex];
      if (answer) {
        answers[side] = answer;
      }
    }

    // Phase: evaluating
    room.phase = 'evaluating';
    this.server.to(room.roomId).emit('evaluating');

    try {
      // Step 1: Evaluate values
      const evalResult = await this.llmService.evaluateValues(topic, answers, themeId);

      // Show values
      room.phase = 'showing_values';
      this.server.to(room.roomId).emit('round_values', {
        roundIndex,
        values: evalResult.values,
        answers,
        reasons: evalResult.reasons,
      });

      // Step 2: Wait 3 seconds, then generate battle report
      await this.delay(3000);

      const battleResult = await this.llmService.generateBattle(
        topic,
        answers,
        evalResult.values,
        themeId,
      );

      // Build round result
      const roundResult: RoundResult = {
        roundIndex,
        topic,
        answers: answers as Record<PlayerSide, string>,
        values: evalResult.values as Record<PlayerSide, typeof evalResult.values[string]>,
        reasons: evalResult.reasons as Record<PlayerSide, string>,
        narrative: battleResult.narrative,
        winner: battleResult.winner as PlayerSide,
        rankOrder: battleResult.rankOrder as PlayerSide[],
      };

      this.roomService.addRoundResult(room, roundResult);

      // Show battle report
      this.server.to(room.roomId).emit('round_battle', {
        roundIndex,
        narrative: battleResult.narrative,
        winner: battleResult.winner,
        rankOrder: battleResult.rankOrder,
      });

      // If game is over, send game_over event
      if (room.gameOver) {
        // Build final ranking
        const finalRanking = [...room.players]
          .filter(p => !room.disconnected[p.side])
          .sort((a, b) => {
            if (room.scores[b.side] !== room.scores[a.side]) {
              return room.scores[b.side] - room.scores[a.side];
            }
            return room.totalBattlePower[b.side] - room.totalBattlePower[a.side];
          })
          .map(p => ({
            side: p.side,
            nickname: p.nickname,
            wins: room.scores[p.side],
            totalBattlePower: room.totalBattlePower[p.side],
          }));

        this.server.to(room.roomId).emit('game_over', {
          winner: room.winner,
          scores: room.scores,
          totalBattlePower: room.totalBattlePower,
          finalRanking,
        });
      }
    } catch (err) {
      console.error('LLM evaluation error:', err);
      this.server.to(room.roomId).emit('error', {
        message: 'AI评估出错，请重试',
      });
    }
  }

  @SubscribeMessage('next_round')
  async handleNextRound(client: Socket) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    const side = this.roomService.getPlayerSide(room, client.id);
    if (!side) {
      client.emit('error', { message: '无法确定你的阵营' });
      return;
    }

    if (room.gameOver) {
      client.emit('error', { message: '游戏已结束' });
      return;
    }

    const allReady = this.roomService.markNextRoundReady(room, side);
    const readyCount = this.roomService.getNextRoundReadyCount(room);
    const activeSides = this.roomService.getActiveSides(room);

    // Notify all players
    this.server.to(room.roomId).emit('player_next_ready', {
      side,
      readyCount,
      totalPlayers: activeSides.length,
    });

    if (allReady) {
      const advanced = this.roomService.advanceToNextRound(room);
      if (!advanced) return;
      // Notify clients which round is starting, then evaluate
      this.server.to(room.roomId).emit('round_start', {
        roundIndex: room.currentRound,
        topic: room.topics[room.currentRound],
      });
      await this.runEvaluation(room);
    }
  }

  @SubscribeMessage('restart_game')
  handleRestartGame(client: Socket, payload: { themeId: string }) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    const side = this.roomService.getPlayerSide(room, client.id);
    if (!side) {
      client.emit('error', { message: '无法确定你的阵营' });
      return;
    }

    if (!room.gameOver) {
      client.emit('error', { message: '游戏尚未结束' });
      return;
    }

    if (room.restartRequest) {
      client.emit('error', { message: '已有重开请求等待确认' });
      return;
    }

    this.roomService.requestRestart(room, side, payload.themeId);

    const themeName =
      this.gameService
        .getAvailableThemes()
        .find(t => t.id === payload.themeId)?.name || payload.themeId;

    const confirmStatus = this.roomService.getRestartConfirmStatus(room);

    // Notify all other players
    this.server.to(room.roomId).emit('restart_requested', {
      by: side,
      themeId: payload.themeId,
      themeName,
      confirmStatus,
    });
  }

  @SubscribeMessage('confirm_restart')
  handleConfirmRestart(client: Socket) {
    const room = this.roomService.getRoomBySocketId(client.id);
    if (!room) {
      client.emit('error', { message: '你不在任何房间中' });
      return;
    }

    const side = this.roomService.getPlayerSide(room, client.id);
    if (!side) {
      client.emit('error', { message: '无法确定你的阵营' });
      return;
    }

    // First, notify everyone about the confirmation progress
    const confirmStatus = this.roomService.getRestartConfirmStatus(room);
    this.server.to(room.roomId).emit('restart_confirm_progress', {
      confirmer: side,
      confirmStatus,
    });

    const confirmed = this.roomService.confirmRestart(room, side);
    if (!confirmed) {
      // Not all confirmed yet, that's okay
      return;
    }

    const themeName =
      this.gameService
        .getAvailableThemes()
        .find(t => t.id === room.themeId)?.name || room.themeId;

    const playersList = room.players.map(p => ({
      side: p.side,
      nickname: p.nickname,
    }));

    this.server.to(room.roomId).emit('restart_confirmed');
    this.server.to(room.roomId).emit('game_start', {
      topics: room.topics,
      players: playersList,
      themeId: room.themeId,
      themeName,
      maxPlayers: room.maxPlayers,
      totalRounds: room.totalRounds,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
