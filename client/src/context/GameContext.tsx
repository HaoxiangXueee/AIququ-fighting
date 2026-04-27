import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { GameState, GamePhase, PlayerSide, AnswerValues, RoundResult, ThemeInfo } from '../types/game';
import { useSocket } from '../hooks/useSocket';

const initialState: GameState = {
  phase: 'lobby',
  roomId: null,
  mySide: null,
  myNickname: '',
  redPlayer: null,
  bluePlayer: null,
  availableThemes: [],
  selectedTheme: null,
  topics: [],
  currentRound: 0,
  roundResults: [],
  scores: { red: 0, blue: 0 },
  opponentSubmitted: false,
  currentRoundValues: null,
  currentRoundBattle: null,
  nextRoundReady: false,
  opponentNextRoundReady: false,
  restartRequested: null,
  errorMessage: null,
};

interface GameContextValue extends GameState {
  createRoom: (nickname: string) => void;
  joinRoom: (roomId: string, nickname: string) => void;
  selectTheme: (themeId: string) => void;
  submitAnswers: (answers: [string, string, string]) => void;
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
    selectTheme,
    submitAnswers,
    nextRound,
    restartGame,
    confirmRestart,
  } = useSocket();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('room_created', (data: { roomId: string }) => {
      setState((prev) => ({
        ...prev,
        phase: 'waiting' as GamePhase,
        roomId: data.roomId,
        mySide: 'red' as PlayerSide,
        redPlayer: prev.myNickname,
      }));
    });

    socket.on(
      'opponent_joined',
      (data: { availableThemes: ThemeInfo[]; redPlayer: string; bluePlayer: string }) => {
        setState((prev) => ({
          ...prev,
          phase: 'theme_select' as GamePhase,
          availableThemes: data.availableThemes,
          redPlayer: data.redPlayer,
          bluePlayer: data.bluePlayer,
        }));
      },
    );

    socket.on(
      'game_start',
      (data: { topics: string[]; redPlayer: string; bluePlayer: string; themeId: string; themeName: string }) => {
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
            redPlayer: data.redPlayer,
            bluePlayer: data.bluePlayer,
            selectedTheme,
            currentRound: 0,
            opponentSubmitted: false,
            currentRoundValues: null,
            currentRoundBattle: null,
            nextRoundReady: false,
            opponentNextRoundReady: false,
            restartRequested: null,
            scores: { red: 0, blue: 0 },
            roundResults: [],
          };
        });
      },
    );

    socket.on('opponent_submitted', () => {
      setState((prev) => ({
        ...prev,
        opponentSubmitted: true,
      }));
    });

    socket.on('opponent_next_ready', () => {
      setState((prev) => ({
        ...prev,
        opponentNextRoundReady: true,
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
        opponentSubmitted: false,
        nextRoundReady: false,
        opponentNextRoundReady: false,
        phase: 'evaluating' as GamePhase,
      }));
    });

    socket.on(
      'round_values',
      (data: {
        roundIndex: number;
        values: { red: AnswerValues; blue: AnswerValues };
        answers: { red: string; blue: string };
        reasons: { red: string; blue: string };
      }) => {
        setState((prev) => ({
          ...prev,
          phase: 'showing_values' as GamePhase,
          currentRoundValues: {
            red: data.values.red,
            blue: data.values.blue,
            reasons: data.reasons,
            answers: data.answers,
          },
        }));
      },
    );

    socket.on(
      'round_battle',
      (data: { roundIndex: number; narrative: string; winner: PlayerSide }) => {
        setState((prev) => {
          // Build the round result from values + battle
          const result: RoundResult = {
            roundIndex: data.roundIndex,
            topic: prev.topics[data.roundIndex],
            answers: prev.currentRoundValues?.answers || {
              red: '',
              blue: '',
            },
            values: {
              red: prev.currentRoundValues?.red || { relevance: 0, power: 0, battlePower: 0 },
              blue: prev.currentRoundValues?.blue || { relevance: 0, power: 0, battlePower: 0 },
            },
            reasons: prev.currentRoundValues?.reasons || { red: '', blue: '' },
            narrative: data.narrative,
            winner: data.winner,
          };

          const newScores = { ...prev.scores };
          newScores[data.winner] += 1;

          const newRoundResults = [...prev.roundResults, result];

          const isGameComplete = newScores.red >= 2 || newScores.blue >= 2 || data.roundIndex >= 2;
          const newPhase = isGameComplete ? ('game_over' as GamePhase) : ('round_end' as GamePhase);

          return {
            ...prev,
            phase: newPhase,
            currentRoundBattle: {
              narrative: data.narrative,
              winner: data.winner,
            },
            scores: newScores,
            roundResults: newRoundResults,
          };
        });
      },
    );

    socket.on(
      'game_over',
      (data: { winner: PlayerSide | null; scores: { red: number; blue: number } }) => {
        setState((prev) => ({
          ...prev,
          phase: 'game_over' as GamePhase,
          scores: data.scores,
        }));
      },
    );

    socket.on('restart_requested', (data: { by: PlayerSide; themeId: string; themeName: string }) => {
      setState((prev) => ({
        ...prev,
        restartRequested: { by: data.by, themeId: data.themeId, themeName: data.themeName },
      }));
    });

    socket.on('restart_confirmed', () => {
      setState((prev) => ({
        ...prev,
        restartRequested: null,
        nextRoundReady: false,
        opponentNextRoundReady: false,
      }));
    });

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({
        ...prev,
        errorMessage: data.message,
      }));
    });

    socket.on('opponent_left', () => {
      setState({
        ...initialState,
        errorMessage: '对手已断开连接',
      });
    });

    return () => {
      socket.off('room_created');
      socket.off('opponent_joined');
      socket.off('game_start');
      socket.off('opponent_submitted');
      socket.off('opponent_next_ready');
      socket.off('evaluating');
      socket.off('round_start');
      socket.off('round_values');
      socket.off('round_battle');
      socket.off('game_over');
      socket.off('restart_requested');
      socket.off('restart_confirmed');
      socket.off('error');
      socket.off('opponent_left');
    };
  }, [socketRef]);

  const handleCreateRoom = useCallback(
    (nickname: string) => {
      setState((prev) => ({ ...prev, myNickname: nickname }));
      createRoom(nickname);
    },
    [createRoom],
  );

  const handleJoinRoom = useCallback(
    (roomId: string, nickname: string) => {
      setState((prev) => ({
        ...prev,
        myNickname: nickname,
        mySide: 'blue' as PlayerSide,
        bluePlayer: nickname,
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
