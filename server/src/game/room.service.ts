import { Injectable } from '@nestjs/common';
import { Room, PlayerSide, Player, RoundResult, ALL_SIDES, SIDE_LABELS } from './types/game';
import { GameService } from './game.service';

const ROOM_ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_ID_LENGTH = 6;

@Injectable()
export class RoomService {
  private rooms: Map<string, Room> = new Map();

  constructor(private gameService: GameService) {}

  generateRoomId(): string {
    let roomId: string;
    do {
      roomId = '';
      for (let i = 0; i < ROOM_ID_LENGTH; i++) {
        roomId += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)];
      }
    } while (this.rooms.has(roomId));
    return roomId;
  }

  private initSideRecord<T>(defaultValue: (side: PlayerSide) => T): Record<PlayerSide, T> {
    const record = {} as Record<PlayerSide, T>;
    for (const side of ALL_SIDES) {
      record[side] = defaultValue(side);
    }
    return record;
  }

  createRoom(socketId: string, nickname: string, maxPlayers: number, totalRounds: number): Room {
    const roomId = this.generateRoomId();
    const clampedMax = Math.max(2, Math.min(4, maxPlayers));
    const clampedRounds = Math.max(2, Math.min(5, totalRounds));
    const room: Room = {
      roomId,
      hostSide: 'red',
      maxPlayers: clampedMax,
      totalRounds: clampedRounds,
      players: [{ socketId, nickname, side: 'red' }],
      themeId: null,
      topics: [],
      answers: this.initSideRecord(() => Array(clampedRounds).fill(null) as (string | null)[]),
      submitted: this.initSideRecord(() => false),
      currentRound: 0,
      roundResults: [],
      scores: this.initSideRecord(() => 0),
      totalBattlePower: this.initSideRecord(() => 0),
      disconnected: this.initSideRecord(() => false),
      phase: 'waiting',
      gameOver: false,
      winner: null,
      nextRoundReady: this.initSideRecord(() => false),
      restartRequest: null,
      restartConfirmed: new Set(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, socketId: string, nickname: string): { room: Room; side: PlayerSide } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.phase !== 'waiting') return null; // Game already started
    if (room.players.length >= room.maxPlayers) return null; // Room is full

    // Assign next available side by ALL_SIDES order
    const usedSides = new Set(room.players.map(p => p.side));
    const nextSide = ALL_SIDES.find(s => !usedSides.has(s));
    if (!nextSide) return null;

    const player: Player = { socketId, nickname, side: nextSide };
    room.players.push(player);

    return { room, side: nextSide };
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getRoomBySocketId(socketId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) {
        return room;
      }
    }
    return null;
  }

  getPlayerSide(room: Room, socketId: string): PlayerSide | null {
    const player = room.players.find(p => p.socketId === socketId);
    return player?.side || null;
  }

  getPlayerBySide(room: Room, side: PlayerSide): Player | undefined {
    return room.players.find(p => p.side === side);
  }

  getActiveSides(room: Room): PlayerSide[] {
    return room.players
      .filter(p => !room.disconnected[p.side])
      .map(p => p.side);
  }

  getActivePlayerCount(room: Room): number {
    return this.getActiveSides(room).length;
  }

  isHost(room: Room, socketId: string): boolean {
    const player = room.players.find(p => p.socketId === socketId);
    return player?.side === room.hostSide;
  }

  canStartGame(room: Room): boolean {
    return room.phase === 'waiting' && this.getActiveSides(room).length >= 2;
  }

  submitAnswers(room: Room, side: PlayerSide, answers: string[]): boolean {
    const validation = this.gameService.validateAnswers(answers, room.totalRounds);
    if (!validation.valid) return false;

    room.answers[side] = answers;
    room.submitted[side] = true;
    return true;
  }

  allSubmitted(room: Room): boolean {
    const activeSides = this.getActiveSides(room);
    return activeSides.every(side => room.submitted[side]);
  }

  getSubmittedCount(room: Room): number {
    const activeSides = this.getActiveSides(room);
    return activeSides.filter(side => room.submitted[side]).length;
  }

  addRoundResult(room: Room, result: RoundResult): void {
    room.roundResults.push(result);
    room.scores[result.winner] += 1;

    // Accumulate totalBattlePower for tiebreak
    for (const side of this.getActiveSides(room)) {
      const values = result.values[side];
      if (values) {
        room.totalBattlePower[side] += values.battlePower;
      }
    }

    if (this.gameService.isGameComplete(room.currentRound, room.totalRounds)) {
      room.gameOver = true;
      room.winner = this.gameService.checkGameWinner(room.scores, room.totalBattlePower, room.players.map(p => p.side));
      room.phase = 'game_over';
    } else {
      room.phase = 'round_end';
    }
  }

  advanceToNextRound(room: Room): boolean {
    if (room.gameOver) return false;

    room.currentRound += 1;
    room.nextRoundReady = this.initSideRecord(() => false);
    // Do NOT reset answers or set phase to answering — answers are already submitted for all topics
    return true;
  }

  markNextRoundReady(room: Room, side: PlayerSide): boolean {
    room.nextRoundReady[side] = true;
    const activeSides = this.getActiveSides(room);
    return activeSides.every(s => room.nextRoundReady[s]);
  }

  getNextRoundReadyCount(room: Room): number {
    const activeSides = this.getActiveSides(room);
    return activeSides.filter(s => room.nextRoundReady[s]).length;
  }

  requestRestart(room: Room, by: PlayerSide, themeId: string): void {
    room.restartRequest = { by, themeId };
    room.restartConfirmed = new Set();
  }

  confirmRestart(room: Room, confirmer: PlayerSide): boolean {
    if (!room.restartRequest) return false;
    if (room.restartRequest.by === confirmer) return false; // Can't confirm own request

    room.restartConfirmed.add(confirmer);

    // All non-initiator active players must confirm
    const activeSides = this.getActiveSides(room);
    const nonInitiatorSides = activeSides.filter(s => s !== room.restartRequest!.by);

    if (nonInitiatorSides.length === 0) return false; // Edge case: only 1 player

    const allConfirmed = nonInitiatorSides.every(s => room.restartConfirmed.has(s));
    if (!allConfirmed) return false;

    const themeId = room.restartRequest.themeId;
    room.restartRequest = null;
    room.restartConfirmed = new Set();

    // Reset game state with new theme
    room.themeId = themeId;
    room.topics = this.gameService.drawTopics(themeId, room.totalRounds);
    room.answers = this.initSideRecord(() => Array(room.totalRounds).fill(null) as (string | null)[]);
    room.submitted = this.initSideRecord(() => false);
    room.currentRound = 0;
    room.roundResults = [];
    room.scores = this.initSideRecord(() => 0);
    room.totalBattlePower = this.initSideRecord(() => 0);
    room.phase = 'answering';
    room.gameOver = false;
    room.winner = null;
    room.nextRoundReady = this.initSideRecord(() => false);

    return true;
  }

  markPlayerDisconnected(room: Room, side: PlayerSide): void {
    room.disconnected[side] = true;
  }

  removePlayer(socketId: string): { roomId: string; remainingSides: PlayerSide[] } | null {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    const player = room.players.find(p => p.socketId === socketId);
    if (!player) return null;

    const side = player.side;

    if (room.phase === 'waiting') {
      // In waiting phase, just remove the player entirely
      room.players = room.players.filter(p => p.socketId !== socketId);
    } else {
      // During game, mark as disconnected (preserve slot)
      this.markPlayerDisconnected(room, side);
    }

    const remainingSides = this.getActiveSides(room);

    // If both all players are gone, remove the room
    if (room.players.length === 0 || (room.phase !== 'waiting' && remainingSides.length === 0)) {
      this.rooms.delete(room.roomId);
    }

    return { roomId: room.roomId, remainingSides };
  }

  getRestartConfirmStatus(room: Room): { total: number; confirmed: number } {
    if (!room.restartRequest) return { total: 0, confirmed: 0 };
    const activeSides = this.getActiveSides(room);
    const nonInitiatorSides = activeSides.filter(s => s !== room.restartRequest!.by);
    return {
      total: nonInitiatorSides.length,
      confirmed: nonInitiatorSides.filter(s => room.restartConfirmed.has(s)).length,
    };
  }
}
