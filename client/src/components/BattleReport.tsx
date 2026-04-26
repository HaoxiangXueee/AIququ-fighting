import { useGame } from '../context/GameContext';

export function BattleReport() {
  const { currentRoundBattle, mySide, nextRound, scores, phase, currentRound, topics, nextRoundReady, opponentNextRoundReady } = useGame();

  if (!currentRoundBattle) return null;

  const isWinner = currentRoundBattle.winner === mySide;
  const isGameOver = phase === 'game_over';

  return (
    <div className="battle-report">
      <div className="battle-topic-label">
        第 {currentRound + 1} 局：{topics[currentRound]}
      </div>
      <div className={`battle-result ${isWinner ? 'win' : 'lose'}`}>
        {isWinner ? '你赢了这局！' : '你输了这局！'}
      </div>
      <div className="narrative-text">{currentRoundBattle.narrative}</div>
      <div className="current-scores">
        <span className="score-red">红方 {scores.red}</span>
        <span className="score-separator">:</span>
        <span className="score-blue">{scores.blue} 蓝方</span>
      </div>
      {!isGameOver && (
        !nextRoundReady ? (
          <button className="btn btn-primary" onClick={nextRound}>
            下一局
          </button>
        ) : !opponentNextRoundReady ? (
          <div className="waiting-status">已准备，等待对手...</div>
        ) : null
      )}
    </div>
  );
}
