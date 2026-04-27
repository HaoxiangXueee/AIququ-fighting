export interface ThemeInfo {
  id: string;        // 'game' | 'history' | 'nba'
  name: string;      // '游戏' | '历史人物' | 'NBA'
  description: string;
  icon: string;      // emoji
}

export interface ThemeDefinition extends ThemeInfo {
  topics: string[];
  prompts: {
    evaluateValues: (topic: string, answers: Record<string, string>) => string;
    generateBattle: (topic: string, answers: Record<string, string>, values: Record<string, { relevance: number; power: number; battlePower: number }>) => string;
  };
}
