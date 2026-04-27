import { useGame } from '../context/GameContext';

export function GameStatus() {
  const {
    phase,
    mySide,
    redPlayer,
    bluePlayer,
    scores,
    roundResults,
    currentRound,
    availableThemes,
    restartGame,
    confirmRestart,
    restartRequested,
  } = useGame();

  const isGameOver = phase === 'game_over';

  const renderPlayers = () => (
    <div className="players">
      <span className={`player red ${mySide === 'red' ? 'me' : ''}`}>
        <span className="side-dot red"></span>
        {redPlayer}
      </span>
      <span className="vs">VS</span>
      <span className={`player blue ${mySide === 'blue' ? 'me' : ''}`}>
        <span className="side-dot blue"></span>
        {bluePlayer}
      </span>
    </div>
  );

  const renderScores = () => (
    <div className="score-display">
      <span className="score-red">{scores.red}</span>
      <span className="score-colon">:</span>
      <span className="score-blue">{scores.blue}</span>
    </div>
  );

  const renderRoundIndicators = () => {
    if (isGameOver) return null;
    return (
      <div className="round-indicators">
        {[0, 1, 2].map((i) => {
          const result = roundResults[i];
          let className = 'round-dot';
          if (result) {
            className += ` ${result.winner}`;
          } else if (i === currentRound) {
            className += ' current';
          }
          return (
            <div key={i} className={className} title={result ? `第${i + 1}局: ${result.winner === 'red' ? '红方' : '蓝方'}胜` : i === currentRound ? '当前局' : '未开始'}>
              {i + 1}
            </div>
          );
        })}
      </div>
    );
  };

  if (isGameOver) {
    const gameWinner = scores.red >= 2 ? 'red' : 'blue';
    const iWon = gameWinner === mySide;
    const isHost = mySide === 'red';

    return (
      <div className="game-status">
        {renderPlayers()}
        {renderScores()}
        <div className={`result ${iWon ? 'win' : 'lose'}`}>
          {iWon ? '擂主已定 — 你胜！' : '擂主已定 — 你败！'}
        </div>

        {restartRequested ? (
          <div className="restart-panel">
            <p className="restart-info">
              {restartRequested.by === mySide
                ? '等待对手确认重开...'
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
