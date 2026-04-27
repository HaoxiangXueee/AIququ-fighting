import { useGame } from '../context/GameContext';
import { PlayerSide, SIDE_LABELS } from '../types/game';

export function BattleReport() {
  const {
    currentRoundBattle,
    mySide,
    nextRound,
    scores,
    phase,
    currentRound,
    topics,
    nextRoundReady,
    nextRoundReadyCount,
    totalActivePlayers,
    players,
  } = useGame();

  if (!currentRoundBattle) return null;

  const isGameOver = phase === 'game_over';
  const myRank = currentRoundBattle.rankOrder.indexOf(mySide!) + 1;

  return (
    <div className="battle-report">
      <div className="battle-topic-label">
        第 {currentRound + 1} 局：{topics[currentRound]}
      </div>
      <div className={`battle-result ${myRank === 1 ? 'win' : 'lose'}`}>
        {myRank === 1
          ? '本轮你第1名！'
          : `本轮你排第${myRank}名`
        }
      </div>
      <div className="narrative-text">{currentRoundBattle.narrative}</div>
      <div className="current-scores">
        {players.map((p, i) => (
          <span key={p.side}>
            {i > 0 && <span className="score-separator"> | </span>}
            <span className={`score-${p.side}`}>
              {SIDE_LABELS[p.side as PlayerSide]} {scores[p.side as PlayerSide] || 0}
            </span>
          </span>
        ))}
      </div>
      {!isGameOver && (
        !nextRoundReady ? (
          <button className="btn btn-primary" onClick={nextRound}>
            下一局
          </button>
        ) : (
          <div className="waiting-status">已准备 {nextRoundReadyCount}/{totalActivePlayers} 人</div>
        )
      )}
    </div>
  );
}
