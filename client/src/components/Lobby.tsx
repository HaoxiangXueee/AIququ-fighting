import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlayerSide, SIDE_LABELS } from '../types/game';

export function Lobby() {
  const { createRoom, joinRoom } = useGame();
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [totalRounds, setTotalRounds] = useState(3);

  const handleCreate = () => {
    if (nickname.trim()) {
      createRoom(nickname.trim(), maxPlayers, totalRounds);
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
            开擂（房主）
          </button>
          <button className="btn btn-blue" onClick={() => setMode('join')}>
            打擂（加入）
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
        <div className="lobby-config">
          <div className="config-item">
            <label className="config-label">人数上限</label>
            <div className="config-buttons">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`config-btn ${maxPlayers === n ? 'active' : ''}`}
                  onClick={() => setMaxPlayers(n)}
                >
                  {n}人
                </button>
              ))}
            </div>
          </div>
          <div className="config-item">
            <label className="config-label">回合数</label>
            <div className="config-buttons">
              {[2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`config-btn ${totalRounds === n ? 'active' : ''}`}
                  onClick={() => setTotalRounds(n)}
                >
                  {n}局
                </button>
              ))}
            </div>
          </div>
        </div>
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
      <p className="lobby-hint">输入擂台号加入对战</p>
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
  const { roomId, players, maxPlayers, startGame, mySide } = useGame();
  const isHost = mySide === 'red';
  const canStart = players.length >= 2;

  return (
    <div className="lobby">
      <h1>等待玩家</h1>
      <p className="room-code">擂台号: {roomId}</p>
      <p className="room-hint">将擂台号分享给对手即可加入对战</p>

      <div className="waiting-players">
        {players.map(p => (
          <div key={p.side} className={`waiting-player ${p.side}`}>
            <span className={`side-dot ${p.side}`}></span>
            <span className="waiting-player-name">{p.nickname}</span>
            <span className={`side-badge ${p.side}`}>{SIDE_LABELS[p.side as PlayerSide]}</span>
          </div>
        ))}
        {Array.from({ length: maxPlayers - players.length }).map((_, i) => {
          const nextSide = ['red', 'blue', 'green', 'yellow'][players.length + i];
          return (
            <div key={nextSide} className="waiting-player empty">
              <span className={`side-dot ${nextSide}`}></span>
              <span className="waiting-player-name">等待加入...</span>
              <span className={`side-badge ${nextSide}`}>{SIDE_LABELS[nextSide as PlayerSide]}</span>
            </div>
          );
        })}
      </div>

      <p className="room-hint">已加入 {players.length}/{maxPlayers} 人</p>

      {isHost && (
        <button
          className="btn btn-primary"
          onClick={startGame}
          disabled={!canStart}
        >
          {canStart ? '开始游戏' : '至少需要2名玩家'}
        </button>
      )}
      {!isHost && (
        <p className="room-hint">等待房主开始游戏...</p>
      )}
    </div>
  );
}
