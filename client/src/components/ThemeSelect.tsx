import { useGame } from '../context/GameContext';

export function ThemeSelect() {
  const { mySide, availableThemes, selectTheme } = useGame();
  const isHost = mySide === 'red';

  return (
    <div className="theme-select">
      <h2 className="theme-select-title">选择对决主题</h2>
      {isHost ? (
        <p className="theme-select-hint">请为本局选择一个主题</p>
      ) : (
        <p className="theme-select-hint waiting">等待房主选择主题...</p>
      )}
      <div className="theme-grid">
        {availableThemes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-card ${!isHost ? 'disabled' : ''}`}
            onClick={() => isHost && selectTheme(theme.id)}
          >
            <span className="theme-card-icon">{theme.icon}</span>
            <span className="theme-card-name">{theme.name}</span>
            <span className="theme-card-desc">{theme.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
