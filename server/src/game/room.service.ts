import { Injectable } from '@nestjs/common';
import { Room, PlayerSide, RoundResult } from './types/game';
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

  createRoom(socketId: string, nickname: string): Room {
    const roomId = this.generateRoomId();
    const room: Room = {
      roomId,
      players: {
        red: { socketId, nickname },
        blue: null,
      },
      topics: [],
      answers: {
        red: [null, null, null],
        blue: [null, null, null],
      },
      submitted: { red: false, blue: false },
      currentRound: 0,
      roundResults: [],
      scores: { red: 0, blue: 0 },
      phase: 'answering',
      gameOver: false,
      winner: null,
      nextRoundReady: { red: false, blue: false },
      restartRequest: null,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, socketId: string, nickname: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.blue) return null; // Room is full

    room.players.blue = { socketId, nickname };
    return room;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getRoomBySocketId(socketId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (
        room.players.red?.socketId === socketId ||
        room.players.blue?.socketId === socketId
      ) {
        return room;
      }
    }
    return null;
  }

  getPlayerSide(room: Room, socketId: string): PlayerSide | null {
    if (room.players.red?.socketId === socketId) return 'red';
    if (room.players.blue?.socketId === socketId) return 'blue';
    return null;
  }

  submitAnswers(room: Room, side: PlayerSide, answers: string[]): boolean {
    const validation = this.gameService.validateAnswers(answers);
    if (!validation.valid) return false;

    room.answers[side] = answers;
    room.submitted[side] = true;
    return true;
  }

  bothSubmitted(room: Room): boolean {
    return room.submitted.red && room.submitted.blue;
  }

  addRoundResult(room: Room, result: RoundResult): void {
    room.roundResults.push(result);
    room.scores[result.winner] += 1;

    if (this.gameService.isGameComplete(room.currentRound, room.scores)) {
      room.gameOver = true;
      room.winner = this.gameService.checkGameWinner(room.scores);
      room.phase = 'game_over';
    } else {
      room.phase = 'round_end';
    }
  }

  advanceToNextRound(room: Room): boolean {
    if (room.gameOver) return false;

    room.currentRound += 1;
    room.nextRoundReady = { red: false, blue: false };
    // Do NOT reset answers or set phase to answering — answers are already submitted for all 3 topics
    return true;
  }

  markNextRoundReady(room: Room, side: PlayerSide): boolean {
    room.nextRoundReady[side] = true;
    return room.nextRoundReady.red && room.nextRoundReady.blue;
  }

  requestRestart(room: Room, by: PlayerSide, option: 'same_topics' | 'new_topics'): void {
    room.restartRequest = { by, option };
  }

  confirmRestart(room: Room, confirmer: PlayerSide): boolean {
    if (!room.restartRequest) return false;
    if (room.restartRequest.by === confirmer) return false; // Can't confirm own request

    const option = room.restartRequest.option;
    room.restartRequest = null;

    // Reset game state
    if (option === 'new_topics') {
      room.topics = this.gameService.drawTopics();
    }
    room.answers = { red: [null, null, null], blue: [null, null, null] };
    room.submitted = { red: false, blue: false };
    room.currentRound = 0;
    room.roundResults = [];
    room.scores = { red: 0, blue: 0 };
    room.phase = 'answering';
    room.gameOver = false;
    room.winner = null;
    room.nextRoundReady = { red: false, blue: false };

    return true;
  }

  removePlayer(socketId: string): { roomId: string; opponentId: string | null } | null {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    let opponentId: string | null = null;

    if (room.players.red?.socketId === socketId) {
      opponentId = room.players.blue?.socketId || null;
      room.players.red = null;
    } else if (room.players.blue?.socketId === socketId) {
      opponentId = room.players.red?.socketId || null;
      room.players.blue = null;
    }

    // If both players are gone, remove the room
    if (!room.players.red && !room.players.blue) {
      this.rooms.delete(room.roomId);
    }

    return { roomId: room.roomId, opponentId };
  }
}
