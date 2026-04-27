// 4-color factions
export type PlayerSide = 'red' | 'blue' | 'green' | 'yellow';

export const ALL_SIDES: PlayerSide[] = ['red', 'blue', 'green', 'yellow'];
export const SIDE_LABELS: Record<PlayerSide, string> = {
  red: '红方',
  blue: '蓝方',
  green: '绿方',
  yellow: '黄方',
};

export type GamePhase =
  | 'waiting'
  | 'theme_select'
  | 'answering'
  | 'evaluating'
  | 'showing_values'
  | 'showing_battle'
  | 'round_end'
  | 'game_over';

export interface Player {
  socketId: string;
  nickname: string;
  side: PlayerSide;
}

export interface AnswerValues {
  relevance: number;   // 0.1-10
  power: number;       // 5-100
  battlePower: number; // relevance * power
}

export interface RoundResult {
  roundIndex: number;
  topic: string;
  answers: Record<PlayerSide, string>;
  values: Record<PlayerSide, AnswerValues>;
  reasons: Record<PlayerSide, string>;
  narrative: string;
  winner: PlayerSide;
  rankOrder: PlayerSide[];
}

export interface Room {
  roomId: string;
  hostSide: PlayerSide;                        // Always 'red'
  maxPlayers: number;                          // 2-4, set by host
  totalRounds: number;                         // 2-5, set by host
  players: Player[];                           // Dynamic array
  themeId: string | null;
  topics: string[];
  answers: Record<PlayerSide, (string | null)[]>;
  submitted: Record<PlayerSide, boolean>;
  currentRound: number;
  roundResults: RoundResult[];
  scores: Record<PlayerSide, number>;          // Win count per player
  totalBattlePower: Record<PlayerSide, number>; // Cumulative battlePower for tiebreak
  disconnected: Record<PlayerSide, boolean>;    // Disconnect flags
  phase: GamePhase;
  gameOver: boolean;
  winner: PlayerSide | null;
  nextRoundReady: Record<PlayerSide, boolean>;
  restartRequest: { by: PlayerSide; themeId: string } | null;
  restartConfirmed: Set<PlayerSide>;           // Track who confirmed restart
}
