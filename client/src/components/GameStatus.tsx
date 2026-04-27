import { useGame } from '../context/GameContext';
import { PlayerSide, SIDE_LABELS } from '../types/game';

export function GameStatus() {
  const {
    phase,
    mySide,
    players,
    scores,
    roundResults,
    currentRound,
    totalRounds,
    availableThemes,
    restartGame,
    confirmRestart,
    restartRequested,
    finalRanking,
  } = useGame();

  const isGameOver = phase === 'game_over';

  const renderPlayers = () => (
    <div className="players">
      {players.map((p, i) => (
        <span key={p.side}>
          <span className={`player ${p.side} ${mySide === p.side ? 'me' : ''}`}>
            <span className={`side-dot ${p.side}`}></span>
            {p.nickname}
          </span>
          {i < players.length - 1 && <span className="vs">VS</span>}
        </span>
      ))}
    </div>
  );

  const renderScores = () => {
    const sorted = [...players].sort((a, b) => (scores[b.side as PlayerSide] || 0) - (scores[a.side as PlayerSide] || 0));
    return (
      <div className="score-display">
        {sorted.map(p => (
          <span key={p.side} className={`score-${p.side}`}>
            {SIDE_LABELS[p.side as PlayerSide]} {scores[p.side as PlayerSide] || 0}
          </span>
        ))}
      </div>
    );
  };

  const renderRoundIndicators = () => {
    if (isGameOver) return null;
    return (
      <div className="round-indicators">
        {Array.from({ length: totalRounds }).map((_, i) => {
          const result = roundResults[i];
          let className = 'round-dot';
          if (result) {
            className += ` ${result.winner}`;
          } else if (i === currentRound) {
            className += ' current';
          }
          return (
            <div key={i} className={className} title={result ? `第${i + 1}局: ${SIDE_LABELS[result.winner]}胜` : i === currentRound ? '当前局' : '未开始'}>
              {i + 1}
            </div>
          );
        })}
      </div>
    );
  };

  if (isGameOver) {
    const myRank = finalRanking.findIndex(r => r.side === mySide) + 1;
    const isHost = mySide === 'red';

    return (
      <div className="game-status">
        {renderPlayers()}

        <div className="final-ranking">
          {finalRanking.map((entry, i) => (
            <div key={entry.side} className={`ranking-row ${entry.side === mySide ? 'me' : ''}`}>
              <span className="ranking-pos">{i === 0 ? '🏆' : `#${i + 1}`}</span>
              <span className={`side-dot ${entry.side}`}></span>
              <span className="ranking-name">{entry.nickname}</span>
              <span className="ranking-wins">{entry.wins}胜</span>
              <span className="ranking-power">战力{entry.totalBattlePower}</span>
            </div>
          ))}
        </div>

        <div className={`result ${myRank === 1 ? 'win' : 'lose'}`}>
          {myRank === 1 ? '擂主已定 — 你胜！' : `你排第${myRank}名`}
        </div>

        {restartRequested ? (
          <div className="restart-panel">
            <p className="restart-info">
              {restartRequested.by === mySide
                ? `等待对手确认重开... (${restartRequested.confirmStatus.confirmed}/${restartRequested.confirmStatus.total})`
                : `对手请求以「${restartRequested.themeName}」主题重开，是否同意？`}
            </p>
            {restartRequested.by !== mySide && (
              <button className="btn btn-primary" onClick={confirmRestart}>
                同意重开
              </button>
            )}
          </div>
        ) : (
          <div className="restart-section">
            {isHost ? (
              <>
                <p className="restart-label">选择主题再来一局</p>
                <div className="theme-grid restart-theme-grid">
                  {availableThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className="theme-card restart-theme-card"
                      onClick={() => restartGame(theme.id)}
                    >
                      <span className="theme-card-icon">{theme.icon}</span>
                      <span className="theme-card-name">{theme.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="restart-label waiting">等待房主选择主题重开...</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-status">
      {renderPlayers()}
      {renderScores()}
      {renderRoundIndicators()}
    </div>
  );
}
