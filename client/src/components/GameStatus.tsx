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

    return (
      <div className="game-status">
        {renderPlayers()}
        {renderScores()}
        <div className={`result ${iWon ? 'win' : 'lose'}`}>
          {iWon ? '你赢了！' : '你输了！'}
        </div>

        {restartRequested ? (
          <div className="restart-panel">
            <p className="restart-info">
              {restartRequested.by === mySide
                ? '等待对手确认重开...'
                : `对手请求${
                    restartRequested.option === 'same_topics' ? '同题目' : '换题目'
                  }再来，是否同意？`}
            </p>
            {restartRequested.by !== mySide && (
              <button className="btn btn-primary" onClick={confirmRestart}>
                同意重开
              </button>
            )}
          </div>
        ) : (
          <div className="restart-options">
            <button className="btn btn-red" onClick={() => restartGame('same_topics')}>
              同题目再来
            </button>
            <button className="btn btn-blue" onClick={() => restartGame('new_topics')}>
              换题目重来
            </button>
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
