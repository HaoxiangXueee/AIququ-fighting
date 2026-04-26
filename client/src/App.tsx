import { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Lobby, Waiting } from './components/Lobby';
import { AnswerForm } from './components/AnswerForm';
import { BattleCard } from './components/BattleCard';
import { BattleReport } from './components/BattleReport';
import { GameStatus } from './components/GameStatus';
import './App.css';

function Game() {
  const { phase, errorMessage, clearError } = useGame();

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(clearError, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, clearError]);

  return (
    <div className="app">
      {errorMessage && (
        <div className="toast" onClick={clearError}>
          {errorMessage}
        </div>
      )}

      {phase === 'lobby' && <Lobby />}
      {phase === 'waiting' && <Waiting />}

      {(phase === 'answering' || phase === 'evaluating' || phase === 'showing_values' || phase === 'showing_battle' || phase === 'round_end' || phase === 'game_over') && (
        <div className="game-area">
          <GameStatus />
          {phase === 'answering' && <AnswerForm />}
          {phase === 'evaluating' && (
            <div className="evaluating-overlay">
              <div className="evaluating-spinner"></div>
              <p>AI正在评估双方答案...</p>
            </div>
          )}
          {phase === 'showing_values' && <BattleCard />}
          {(phase === 'showing_battle' || phase === 'round_end') && (
            <>
              <BattleCard />
              <BattleReport />
            </>
          )}
          {phase === 'game_over' && (
            <>
              <BattleCard />
              <BattleReport />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
