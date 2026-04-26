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
import { PlayerSide, RoundResult, Room } from './types/game';

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
      if (result.opponentId) {
        this.server.to(result.opponentId).emit('opponent_left');
      }
    }
  }

  @SubscribeMessage('create_room')
  handleCreateRoom(client: Socket, payload: { nickname: string }) {
    const room = this.roomService.createRoom(client.id, payload.nickname);
    client.join(room.roomId);
    client.emit('room_created', { roomId: room.roomId });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { roomId: string; nickname: string }) {
    const room = this.roomService.joinRoom(payload.roomId, client.id, payload.nickname);
    if (!room) {
      client.emit('error', { message: '房间不存在或已满' });
      return;
    }

    client.join(room.roomId);

    // Draw topics when both players are ready
    room.topics = this.gameService.drawTopics();

    this.server.to(room.roomId).emit('game_start', {
      topics: room.topics,
      redPlayer: room.players.red?.nickname,
      bluePlayer: room.players.blue?.nickname,
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
      const validation = this.gameService.validateAnswers(payload.answers);
      client.emit('error', { message: validation.message || '答案格式不正确' });
      return;
    }

    // Notify opponent that this player submitted
    const opponentSide: PlayerSide = side === 'red' ? 'blue' : 'red';
    const opponentSocketId = room.players[opponentSide]?.socketId;
    if (opponentSocketId) {
      this.server.to(opponentSocketId).emit('opponent_submitted');
    }

    // If both submitted, run evaluation
    if (this.roomService.bothSubmitted(room)) {
      await this.runEvaluation(room);
    }
  }

  private async runEvaluation(room: Room) {
    const roundIndex = room.currentRound;
    const topic = room.topics[roundIndex];
    const redAnswer = room.answers.red[roundIndex]!;
    const blueAnswer = room.answers.blue[roundIndex]!;

    // Phase: evaluating
    room.phase = 'evaluating';
    this.server.to(room.roomId).emit('evaluating');

    try {
      // Step 1: Evaluate values
      const evalResult = await this.llmService.evaluateValues(topic, redAnswer, blueAnswer);

      // Show values
      room.phase = 'showing_values';
      this.server.to(room.roomId).emit('round_values', {
        roundIndex,
        values: { red: evalResult.red, blue: evalResult.blue },
        answers: { red: redAnswer, blue: blueAnswer },
        reasons: { red: evalResult.redReason, blue: evalResult.blueReason },
      });

      // Step 2: Wait 3 seconds, then generate battle report
      await this.delay(3000);

      const battleResult = await this.llmService.generateBattle(
        topic,
        redAnswer,
        blueAnswer,
        evalResult.red,
        evalResult.blue,
      );

      // Build round result
      const roundResult: RoundResult = {
        roundIndex,
        topic,
        answers: { red: redAnswer, blue: blueAnswer },
        values: { red: evalResult.red, blue: evalResult.blue },
        reasons: { red: evalResult.redReason, blue: evalResult.blueReason },
        narrative: battleResult.narrative,
        winner: battleResult.winner,
      };

      this.roomService.addRoundResult(room, roundResult);

      // Show battle report
      this.server.to(room.roomId).emit('round_battle', {
        roundIndex,
        narrative: battleResult.narrative,
        winner: battleResult.winner,
      });

      // If game is over, send game_over event
      if (room.gameOver) {
        this.server.to(room.roomId).emit('game_over', {
          winner: room.winner,
          scores: room.scores,
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

    const bothReady = this.roomService.markNextRoundReady(room, side);

    // Notify opponent that this player is ready for next round
    const opponentSide: PlayerSide = side === 'red' ? 'blue' : 'red';
    const opponentSocketId = room.players[opponentSide]?.socketId;
    if (opponentSocketId) {
      this.server.to(opponentSocketId).emit('opponent_next_ready');
    }

    if (bothReady) {
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
  handleRestartGame(client: Socket, payload: { option: 'same_topics' | 'new_topics' }) {
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

    this.roomService.requestRestart(room, side, payload.option);

    const opponentSide: PlayerSide = side === 'red' ? 'blue' : 'red';
    const opponentSocketId = room.players[opponentSide]?.socketId;
    if (opponentSocketId) {
      this.server.to(opponentSocketId).emit('restart_requested', {
        by: side,
        option: payload.option,
      });
    }
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

    const confirmed = this.roomService.confirmRestart(room, side);
    if (!confirmed) {
      client.emit('error', { message: '无法确认重开' });
      return;
    }

    this.server.to(room.roomId).emit('restart_confirmed');
    this.server.to(room.roomId).emit('game_start', {
      topics: room.topics,
      redPlayer: room.players.red?.nickname,
      bluePlayer: room.players.blue?.nickname,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
