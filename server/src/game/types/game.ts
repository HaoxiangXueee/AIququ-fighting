export type PlayerSide = 'red' | 'blue';

export type GamePhase =
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
}

export interface AnswerValues {
  relevance: number;   // 0.1-10
  power: number;       // 5-100
  battlePower: number; // relevance * power
}

export interface RoundResult {
  roundIndex: number;
  topic: string;
  answers: { red: string; blue: string };
  values: { red: AnswerValues; blue: AnswerValues };
  reasons: { red: string; blue: string };
  narrative: string;
  winner: PlayerSide;
}

export interface Room {
  roomId: string;
  players: { red: Player | null; blue: Player | null };
  themeId: string | null;
  topics: string[];
  answers: { red: (string | null)[]; blue: (string | null)[] };
  submitted: { red: boolean; blue: boolean };
  currentRound: number;  // 0-2
  roundResults: RoundResult[];
  scores: { red: number; blue: number };
  phase: GamePhase;
  gameOver: boolean;
  winner: PlayerSide | null;
  nextRoundReady: { red: boolean; blue: boolean };
  restartRequest: { by: PlayerSide; themeId: string } | null;
}
