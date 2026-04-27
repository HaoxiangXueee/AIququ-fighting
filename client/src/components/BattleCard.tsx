import { useGame } from '../context/GameContext';
import { AnswerValues, PlayerSide, SIDE_LABELS } from '../types/game';

function ValueCard({
  side,
  nickname,
  values,
  reason,
  answer,
  rank,
}: {
  side: string;
  nickname: string;
  values: AnswerValues;
  reason: string;
  answer: string;
  rank: number;
}) {
  return (
    <div className={`battle-card ${side}`}>
      <div className="card-header">
        <span className={`side-badge ${side}`}>{SIDE_LABELS[side as PlayerSide]}</span>
        <span className="card-nickname">{nickname}</span>
        {rank === 1 && <span className="rank-badge">TOP</span>}
      </div>
      <div className="card-answer">"{answer}"</div>
      <div className="card-stats">
        <div className="stat">
          <span className="stat-label">关联系数</span>
          <span className="stat-value">{values.relevance}</span>
        </div>
        <div className="stat">
          <span className="stat-label">夯度</span>
          <span className="stat-value">{values.power}</span>
        </div>
        <div className="stat stat-main">
          <span className="stat-label">战斗力</span>
          <span className="stat-value highlight">{values.battlePower}</span>
        </div>
      </div>
      <div className="card-reason">{reason}</div>
    </div>
  );
}

export function BattleCard() {
  const { currentRoundValues, players, currentRoundBattle } = useGame();

  if (!currentRoundValues) return null;

  // Build list of active players with their values, sorted by battlePower
  const cardData = players
    .filter(p => currentRoundValues.values[p.side] !== undefined)
    .map(p => {
      const rankIndex = currentRoundBattle?.rankOrder
        ? currentRoundBattle.rankOrder.indexOf(p.side) + 1
        : 0;
      return {
        side: p.side,
        nickname: p.nickname,
        values: currentRoundValues.values[p.side],
        reason: currentRoundValues.reasons[p.side] || '',
        answer: currentRoundValues.answers[p.side] || '',
        rank: rankIndex,
      };
    })
    .sort((a, b) => b.values.battlePower - a.values.battlePower);

  return (
    <div className={`battle-cards players-${cardData.length}`}>
      {cardData.map(data => (
        <ValueCard
          key={data.side}
          side={data.side}
          nickname={data.nickname}
          values={data.values}
          reason={data.reason}
          answer={data.answer}
          rank={data.rank}
        />
      ))}
    </div>
  );
}
