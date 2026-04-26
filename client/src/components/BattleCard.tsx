import { useGame } from '../context/GameContext';
import { AnswerValues } from '../types/game';

function ValueCard({
  side,
  nickname,
  values,
  reason,
  answer,
}: {
  side: 'red' | 'blue';
  nickname: string;
  values: AnswerValues;
  reason: string;
  answer: string;
}) {
  return (
    <div className={`battle-card ${side}`}>
      <div className="card-header">
        <span className={`side-badge ${side}`}>{side === 'red' ? '红方' : '蓝方'}</span>
        <span className="card-nickname">{nickname}</span>
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
  const { currentRoundValues, redPlayer, bluePlayer } = useGame();

  if (!currentRoundValues) return null;

  return (
    <div className="battle-cards">
      <ValueCard
        side="red"
        nickname={redPlayer || '红方'}
        values={currentRoundValues.red}
        reason={currentRoundValues.reasons.red}
        answer={currentRoundValues.answers.red}
      />
      <div className="vs-divider">VS</div>
      <ValueCard
        side="blue"
        nickname={bluePlayer || '蓝方'}
        values={currentRoundValues.blue}
        reason={currentRoundValues.reasons.blue}
        answer={currentRoundValues.answers.blue}
      />
    </div>
  );
}
