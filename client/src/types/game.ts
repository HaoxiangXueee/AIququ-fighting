export type PlayerSide = 'red' | 'blue';

export type GamePhase =
  | 'lobby'
  | 'waiting'
  | 'answering'
  | 'evaluating'
  | 'showing_values'
  | 'showing_battle'
  | 'round_end'
  | 'game_over';

export interface AnswerValues {
  relevance: number;
  power: number;
  battlePower: number;
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

export interface GameState {
  phase: GamePhase;
  roomId: string | null;
  mySide: PlayerSide | null;
  myNickname: string;
  redPlayer: string | null;
  bluePlayer: string | null;
  topics: string[];
  currentRound: number;
  roundResults: RoundResult[];
  scores: { red: number; blue: number };
  opponentSubmitted: boolean;
  currentRoundValues: {
    red: AnswerValues;
    blue: AnswerValues;
    reasons: { red: string; blue: string };
    answers: { red: string; blue: string };
  } | null;
  currentRoundBattle: { narrative: string; winner: PlayerSide } | null;
  nextRoundReady: boolean;
  opponentNextRoundReady: boolean;
  restartRequested: { by: PlayerSide; option: 'same_topics' | 'new_topics' } | null;
  errorMessage: string | null;
}
