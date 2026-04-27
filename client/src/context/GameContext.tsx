import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { GameState, GamePhase, PlayerSide, PlayerInfo, AnswerValues, ThemeInfo, FinalRankingEntry } from '../types/game';
import { useSocket } from '../hooks/useSocket';

const emptyScores: Record<PlayerSide, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
const emptyBattlePower: Record<PlayerSide, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

const initialState: GameState = {
  phase: 'lobby',
  roomId: null,
  mySide: null,
  myNickname: '',
  players: [],
  maxPlayers: 2,
  totalRounds: 3,
  availableThemes: [],
  selectedTheme: null,
  topics: [],
  currentRound: 0,
  roundResults: [],
  scores: { ...emptyScores },
  totalBattlePower: { ...emptyBattlePower },
  submittedPlayers: [],
  currentRoundValues: null,
  currentRoundBattle: null,
  nextRoundReady: false,
  nextRoundReadyCount: 0,
  totalActivePlayers: 0,
  restartRequested: null,
  finalRanking: [],
  errorMessage: null,
};

interface GameContextValue extends GameState {
  createRoom: (nickname: string, maxPlayers: number, totalRounds: number) => void;
  joinRoom: (roomId: string, nickname: string) => void;
  startGame: () => void;
  selectTheme: (themeId: string) => void;
  submitAnswers: (answers: string[]) => void;
  nextRound: () => void;
  restartGame: (themeId: string) => void;
  confirmRestart: () => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const {
    socketRef,
    createRoom,
    joinRoom,
    startGame,
    selectTheme,
    submitAnswers,
    nextRound,
    restartGame,
    confirmRestart,
  } = useSocket();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('room_created', (data: { roomId: string; maxPlayers: number; totalRounds: number }) => {
      setState((prev) => ({
        ...prev,
        phase: 'waiting' as GamePhase,
        roomId: data.roomId,
        mySide: 'red' as PlayerSide,
        maxPlayers: data.maxPlayers,
        totalRounds: data.totalRounds,
        players: [{ side: 'red' as PlayerSide, nickname: prev.myNickname }],
      }));
    });

    socket.on(
      'player_joined',
      (data: {
        players: PlayerInfo[];
        maxPlayers: number;
        totalRounds: number;
        availableThemes: ThemeInfo[];
        yourSide: PlayerSide;
      }) => {
        setState((prev) => {
          // Determine mySide: if not set yet, use the one from server
          const mySide = prev.mySide || data.yourSide;
          return {
            ...prev,
            phase: 'waiting' as GamePhase,
            players: data.players,
            maxPlayers: data.maxPlayers,
            totalRounds: data.totalRounds,
            availableThemes: data.availableThemes,
            mySide,
          };
        });
      },
    );

    socket.on('game_theme_select', (data: {
      players: PlayerInfo[];
      maxPlayers: number;
      totalRounds: number;
      availableThemes: ThemeInfo[];
    }) => {
      setState((prev) => ({
        ...prev,
        phase: 'theme_select' as GamePhase,
        players: data.players,
        maxPlayers: data.maxPlayers,
        totalRounds: data.totalRounds,
        availableThemes: data.availableThemes,
      }));
    });

    socket.on(
      'game_start',
      (data: {
        topics: string[];
        players: PlayerInfo[];
        themeId: string;
        themeName: string;
        maxPlayers: number;
        totalRounds: number;
      }) => {
        setState((prev) => {
          const selectedTheme = prev.availableThemes.find(t => t.id === data.themeId) || {
            id: data.themeId,
            name: data.themeName,
            description: '',
            icon: '',
          };
          return {
            ...prev,
            phase: 'answering' as GamePhase,
            topics: data.topics,
            players: data.players,
            selectedTheme,
            maxPlayers: data.maxPlayers,
            totalRounds: data.totalRounds,
            currentRound: 0,
            submittedPlayers: [],
            currentRoundValues: null,
            currentRoundBattle: null,
            nextRoundReady: false,
            nextRoundReadyCount: 0,
            restartRequested: null,
            scores: { ...emptyScores },
            totalBattlePower: { ...emptyBattlePower },
            roundResults: [],
            finalRanking: [],
          };
        });
      },
    );

    socket.on('player_submitted', (data: { side: PlayerSide; submittedCount: number; totalPlayers: number }) => {
      setState((prev) => ({
        ...prev,
        submittedPlayers: [...prev.submittedPlayers.filter(s => s !== data.side), data.side],
        totalActivePlayers: data.totalPlayers,
      }));
    });

    socket.on('player_next_ready', (data: { side: PlayerSide; readyCount: number; totalPlayers: number }) => {
      setState((prev) => ({
        ...prev,
        nextRoundReadyCount: data.readyCount,
        totalActivePlayers: data.totalPlayers,
      }));
    });

    socket.on('evaluating', () => {
      setState((prev) => ({
        ...prev,
        phase: 'evaluating' as GamePhase,
      }));
    });

    socket.on('round_start', (data: { roundIndex: number; topic: string }) => {
      setState((prev) => ({
        ...prev,
        currentRound: data.roundIndex,
        currentRoundValues: null,
        currentRoundBattle: null,
        submittedPlayers: [],
        nextRoundReady: false,
        nextRoundReadyCount: 0,
        phase: 'evaluating' as GamePhase,
      }));
    });

    socket.on(
      'round_values',
      (data: {
        roundIndex: number;
        values: Record<string, AnswerValues>;
        answers: Record<string, string>;
        reasons: Record<string, string>;
      }) => {
        setState((prev) => ({
          ...prev,
          phase: 'showing_values' as GamePhase,
          currentRoundValues: {
            values: data.values,
            reasons: data.reasons,
            answers: data.answers,
          },
        }));
      },
    );

    socket.on(
      'round_battle',
      (data: { roundIndex: number; narrative: string; winner: PlayerSide; rankOrder: PlayerSide[] }) => {
        setState((prev) => {
          const newScores = { ...prev.scores };
          newScores[data.winner] += 1;

          const isGameComplete = data.roundIndex >= prev.totalRounds - 1;
          const newPhase = isGameComplete ? ('game_over' as GamePhase) : ('round_end' as GamePhase);

          return {
            ...prev,
            phase: newPhase,
            currentRoundBattle: {
              narrative: data.narrative,
              winner: data.winner,
              rankOrder: data.rankOrder,
            },
            scores: newScores,
          };
        });
      },
    );

    socket.on(
      'game_over',
      (data: {
        winner: PlayerSide | null;
        scores: Record<PlayerSide, number>;
        totalBattlePower: Record<PlayerSide, number>;
        finalRanking: FinalRankingEntry[];
      }) => {
        setState((prev) => ({
          ...prev,
          phase: 'game_over' as GamePhase,
          scores: data.scores,
          totalBattlePower: data.totalBattlePower,
          finalRanking: data.finalRanking,
        }));
      },
    );

    socket.on('restart_requested', (data: { by: PlayerSide; themeId: string; themeName: string; confirmStatus: { total: number; confirmed: number } }) => {
      setState((prev) => ({
        ...prev,
        restartRequested: { by: data.by, themeId: data.themeId, themeName: data.themeName, confirmStatus: data.confirmStatus },
      }));
    });

    socket.on('restart_confirm_progress', (data: { confirmer: PlayerSide; confirmStatus: { total: number; confirmed: number } }) => {
      setState((prev) => {
        if (!prev.restartRequested) return prev;
        return {
          ...prev,
          restartRequested: {
            ...prev.restartRequested,
            confirmStatus: data.confirmStatus,
          },
        };
      });
    });

    socket.on('restart_confirmed', () => {
      setState((prev) => ({
        ...prev,
        restartRequested: null,
        nextRoundReady: false,
        nextRoundReadyCount: 0,
      }));
    });

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({
        ...prev,
        errorMessage: data.message,
      }));
    });

    socket.on('player_left', (data: { remainingSides: PlayerSide[]; remainingPlayers: number }) => {
      setState((prev) => ({
        ...prev,
        players: prev.players.filter(p => data.remainingSides.includes(p.side)),
      }));
    });

    socket.on('game_cancelled', (data: { message: string }) => {
      setState({
        ...initialState,
        errorMessage: data.message,
      });
    });

    socket.on('opponent_left', () => {
      setState({
        ...initialState,
        errorMessage: '对手已断开连接',
      });
    });

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('game_theme_select');
      socket.off('game_start');
      socket.off('player_submitted');
      socket.off('player_next_ready');
      socket.off('evaluating');
      socket.off('round_start');
      socket.off('round_values');
      socket.off('round_battle');
      socket.off('game_over');
      socket.off('restart_requested');
      socket.off('restart_confirm_progress');
      socket.off('restart_confirmed');
      socket.off('error');
      socket.off('player_left');
      socket.off('game_cancelled');
      socket.off('opponent_left');
    };
  }, [socketRef]);

  const handleCreateRoom = useCallback(
    (nickname: string, maxPlayers: number, totalRounds: number) => {
      setState((prev) => ({ ...prev, myNickname: nickname }));
      createRoom(nickname, maxPlayers, totalRounds);
    },
    [createRoom],
  );

  const handleJoinRoom = useCallback(
    (roomId: string, nickname: string) => {
      setState((prev) => ({
        ...prev,
        myNickname: nickname,
      }));
      joinRoom(roomId, nickname);
    },
    [joinRoom],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, errorMessage: null }));
  }, []);

  const handleNextRound = useCallback(() => {
    setState((prev) => ({ ...prev, nextRoundReady: true }));
    nextRound();
  }, [nextRound]);

  return (
    <GameContext.Provider
      value={{
        ...state,
        createRoom: handleCreateRoom,
        joinRoom: handleJoinRoom,
        startGame,
        selectTheme,
        submitAnswers,
        nextRound: handleNextRound,
        restartGame,
        confirmRestart,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
