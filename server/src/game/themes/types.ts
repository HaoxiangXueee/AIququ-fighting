export interface ThemeInfo {
  id: string;        // 'game' | 'history' | 'nba'
  name: string;      // '游戏' | '历史人物' | 'NBA'
  description: string;
  icon: string;      // emoji
}

export interface ThemeDefinition extends ThemeInfo {
  topics: string[];
  prompts: {
    evaluateValues: (topic: string, redAnswer: string, blueAnswer: string) => string;
    generateBattle: (topic: string, redAnswer: string, blueAnswer: string, redValues: { relevance: number; power: number; battlePower: number }, blueValues: { relevance: number; power: number; battlePower: number }) => string;
  };
}
