import { useState } from 'react';
import { useGame } from '../context/GameContext';

export function Lobby() {
  const { createRoom, joinRoom } = useGame();
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  const handleCreate = () => {
    if (nickname.trim()) {
      createRoom(nickname.trim());
    }
  };

  const handleJoin = () => {
    if (nickname.trim() && roomId.trim()) {
      joinRoom(roomId.trim().toUpperCase(), nickname.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  if (mode === 'choose') {
    return (
      <div className="lobby">
        <h1>斗蛐蛐 · 角斗场</h1>
        <p className="lobby-subtitle">填答案 / 拼脑洞 / AI判胜负</p>
        <div className="lobby-buttons">
          <button className="btn btn-red" onClick={() => setMode('create')}>
            开擂（红方）
          </button>
          <button className="btn btn-blue" onClick={() => setMode('join')}>
            打擂（蓝方）
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="lobby">
        <h1>开擂</h1>
        <p className="lobby-hint">你将成为红方擂主</p>
        <input
          className="input"
          type="text"
          placeholder="输入你的名号"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleCreate)}
          maxLength={20}
          autoFocus
        />
        <div className="lobby-buttons">
          <button className="btn btn-red" onClick={handleCreate} disabled={!nickname.trim()}>
            开擂
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('choose')}>
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <h1>打擂</h1>
      <p className="lobby-hint">你将成为蓝方挑战者</p>
      <input
        className="input"
        type="text"
        placeholder="输入你的名号"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        autoFocus
      />
      <input
        className="input"
        type="text"
        placeholder="输入擂台号"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
        onKeyDown={(e) => handleKeyDown(e, handleJoin)}
        maxLength={6}
      />
      <div className="lobby-buttons">
        <button
          className="btn btn-blue"
          onClick={handleJoin}
          disabled={!nickname.trim() || !roomId.trim()}
        >
          打擂
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('choose')}>
          返回
        </button>
      </div>
    </div>
  );
}

export function Waiting() {
  const { roomId } = useGame();

  return (
    <div className="lobby">
      <h1>等待挑战者</h1>
      <p className="room-code">擂台号: {roomId}</p>
      <p className="room-hint">将擂台号分享给对手即可开始对战</p>
      <p className="room-hint">你是红方擂主，对手将作为蓝方挑战者加入</p>
    </div>
  );
}
