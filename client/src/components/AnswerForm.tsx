import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SIDE_LABELS, PlayerSide } from '../types/game';

const MAX_LENGTH = 100;

export function AnswerForm() {
  const { topics, submitAnswers, submittedPlayers, mySide, currentRound, totalRounds, totalActivePlayers } = useGame();
  const answerCount = topics.length;
  const emptyAnswers: string[] = Array(answerCount).fill('');
  const [answers, setAnswers] = useState<string[]>(emptyAnswers);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (index: number, value: string) => {
    if (value.length <= MAX_LENGTH) {
      const newAnswers = [...answers];
      newAnswers[index] = value;
      setAnswers(newAnswers);
    }
  };

  const allFilled = answers.every((a) => a.trim().length > 0);

  const handleSubmit = () => {
    if (allFilled && !submitted) {
      submitAnswers(answers);
      setSubmitted(true);
    }
  };

  return (
    <div className="answer-form">
      <div className="round-header">
        <span className={`side-badge ${mySide}`}>{SIDE_LABELS[mySide as PlayerSide]}</span>
        <span className="round-label">第 {currentRound + 1} 局 / 共 {totalRounds} 局</span>
      </div>

      {topics.map((topic, i) => (
        <div key={i} className="topic-item">
          <label className="topic-label">
            <span className="topic-number">{i + 1}</span>
            {topic}
          </label>
          <div className="input-wrapper">
            <input
              className="input answer-input"
              type="text"
              placeholder="你的答案..."
              value={answers[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              disabled={submitted}
              maxLength={MAX_LENGTH}
            />
            <span className={`char-count ${answers[i].length >= MAX_LENGTH ? 'maxed' : ''}`}>
              {answers[i].length}/{MAX_LENGTH}
            </span>
          </div>
        </div>
      ))}

      <div className="submit-area">
        {!submitted ? (
          <button className="btn btn-red" onClick={handleSubmit} disabled={!allFilled}>
            亮招
          </button>
        ) : (
          <div className="submitted-status">
            <span className="check-icon">&#10003;</span> 已亮招
            {submittedPlayers.length >= totalActivePlayers ? (
              <span className="opponent-ready"> 所有人已提交，正在评估...</span>
            ) : (
              <span className="waiting-opponent"> 已提交 {submittedPlayers.length}/{totalActivePlayers} 人</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
