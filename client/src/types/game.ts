export type PlayerSide = 'red' | 'blue' | 'green' | 'yellow';

export const ALL_SIDES: PlayerSide[] = ['red', 'blue', 'green', 'yellow'];
export const SIDE_LABELS: Record<PlayerSide, string> = {
  red: '红方',
  blue: '蓝方',
  green: '绿方',
  yellow: '黄方',
};

export type GamePhase =
  | 'lobby'
  | 'waiting'
  | 'theme_select'
  | 'answering'
  | 'evaluating'
  | 'showing_values'
  | 'showing_battle'
  | 'round_end'
  | 'game_over';

export interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AnswerValues {
  relevance: number;
  power: number;
  battlePower: number;
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

export interface PlayerInfo {
  side: PlayerSide;
  nickname: string;
}

export interface FinalRankingEntry {
  side: PlayerSide;
  nickname: string;
  wins: number;
  totalBattlePower: number;
}

export interface GameState {
  phase: GamePhase;
  roomId: string | null;
  mySide: PlayerSide | null;
  myNickname: string;
  players: PlayerInfo[];
  maxPlayers: number;
  totalRounds: number;
  availableThemes: ThemeInfo[];
  selectedTheme: ThemeInfo | null;
  topics: string[];
  currentRound: number;
  roundResults: RoundResult[];
  scores: Record<PlayerSide, number>;
  totalBattlePower: Record<PlayerSide, number>;
  submittedPlayers: PlayerSide[];
  currentRoundValues: {
    values: Record<string, AnswerValues>;
    reasons: Record<string, string>;
    answers: Record<string, string>;
  } | null;
  currentRoundBattle: {
    narrative: string;
    winner: PlayerSide;
    rankOrder: PlayerSide[];
  } | null;
  nextRoundReady: boolean;
  nextRoundReadyCount: number;
  totalActivePlayers: number;
  restartRequested: {
    by: PlayerSide;
    themeId: string;
    themeName: string;
    confirmStatus: { total: number; confirmed: number };
  } | null;
  finalRanking: FinalRankingEntry[];
  errorMessage: string | null;
}
