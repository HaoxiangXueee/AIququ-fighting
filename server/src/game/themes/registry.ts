import { ThemeInfo, ThemeDefinition } from './types';
import { GAME_THEME } from './game';
import { HISTORY_THEME } from './history';
import { NBA_THEME } from './nba';

const THEME_REGISTRY: Map<string, ThemeDefinition> = new Map([
  [GAME_THEME.id, GAME_THEME],
  [HISTORY_THEME.id, HISTORY_THEME],
  [NBA_THEME.id, NBA_THEME],
]);

export function getAvailableThemes(): ThemeInfo[] {
  return Array.from(THEME_REGISTRY.values()).map(({ id, name, description, icon }) => ({
    id,
    name,
    description,
    icon,
  }));
}

export function getTheme(themeId: string): ThemeDefinition {
  const theme = THEME_REGISTRY.get(themeId);
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }
  return theme;
}
