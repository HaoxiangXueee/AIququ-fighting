import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      transports: ['websocket', 'polling'],
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      throw new Error('Socket not initialized');
    }
    return socketRef.current;
  }, []);

  const createRoom = useCallback(
    (nickname: string) => {
      getSocket().emit('create_room', { nickname });
    },
    [getSocket],
  );

  const joinRoom = useCallback(
    (roomId: string, nickname: string) => {
      getSocket().emit('join_room', { roomId, nickname });
    },
    [getSocket],
  );

  const submitAnswers = useCallback(
    (answers: [string, string, string]) => {
      getSocket().emit('submit_answers', { answers });
    },
    [getSocket],
  );

  const nextRound = useCallback(() => {
    getSocket().emit('next_round');
  }, [getSocket]);

  const restartGame = useCallback(
    (option: 'same_topics' | 'new_topics') => {
      getSocket().emit('restart_game', { option });
    },
    [getSocket],
  );

  const confirmRestart = useCallback(() => {
    getSocket().emit('confirm_restart');
  }, [getSocket]);

  return {
    socketRef,
    createRoom,
    joinRoom,
    submitAnswers,
    nextRound,
    restartGame,
    confirmRestart,
  };
}
