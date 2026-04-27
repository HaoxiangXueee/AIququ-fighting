import { ThemeDefinition } from './types';

const SIDE_NAMES: Record<string, string> = {
  red: '红方',
  blue: '蓝方',
  green: '绿方',
  yellow: '黄方',
};

export const NBA_THEME: ThemeDefinition = {
  id: 'nba',
  name: 'NBA',
  description: '篮球之巅的巅峰对决',
  icon: '🏀',

  topics: [
    '最强的得分后卫',
    '最强的控球后卫',
    '最强的小前锋',
    '最强的大前锋',
    '最强的中锋',
    '最全面的球员',
    '最强的三分手',
    '最强的防守球员',
    '最强的扣将',
    '最强的关键球先生',
    '最被低估的球员',
    '最强的国际球员',
    '最强的选秀状元',
    '最令人惋惜的伤病天才',
    '最强的替补/第六人',
    '最强的快攻球员',
    '最强的篮板手',
    '最强的传球手/助攻王',
    '最传奇的落选秀',
    '最强的无冠球员',
    '最强的罚球高手',
    '最强的背身单打球员',
    '最强的突破手',
    '最强的双能卫',
    '最强的3D球员',
    '最令人期待的年轻球员',
    '最强的更衣室领袖',
    '最强的单打王',
    '最伟大的左撇子球员',
    '最强的矮个子球员',
    '最会垃圾话的球员',
    '最硬气的球员',
    '球风最华丽的球员',
    '最会传球的内线',
    '最会投关键球的球员',
    '最能带动队友的球员',
    '最强的高个子射手',
    '最励志的球员',
    '巅峰期最无解的球员',
    '最强的绝杀杀手',
    '最令人恐惧的防守者',
    '最稳定的得分手',
    '最强的新秀赛季球员',
    '最强的全明星球员',
    '最会造犯规的球员',
    '运动能力最恐怖的球员',
    '最会打挡拆的球员',
    '最强的空接终结者',
    '最擅长带伤作战的球员',
    '退役战最传奇的球员',
  ],

  prompts: {
    evaluateValues: (topic, answers) => {
      const answerLines = Object.entries(answers)
        .map(([side, answer]) => `${SIDE_NAMES[side] || side}球员：${answer}`)
        .join('\n');

      const resultFields = Object.keys(answers)
        .map(side => {
          const name = SIDE_NAMES[side] || side;
          return `  "${side}": { "relevance": <0.1-10保留一位小数>, "power": <5-100整数> },\n  "${side}Reason": "<一句话说明${name}评分理由>"`;
        })
        .join(',\n');

      return `你是一个"NBA斗蛐蛐"的裁判。多位玩家针对同一个NBA主题各说出一位球员名字，请评估每位球员：

1. 相关系数 (0.1-10)：球员与主题的相关程度。完全跑题0.1，勉强相关2-3，比较相关4-6，高度相关7-8，完美契合9-10。
2. 篮球成就值 (5-100)：该球员的"战斗力"，考虑荣誉、数据、影响力、传奇度。边缘5-20，普通21-40，明星41-60，巨星61-80，GOAT级别81-100。

主题：${topic}
${answerLines}

请以JSON格式返回，不要包含其他文字：
{
${resultFields}
}`;
    },

    generateBattle: (topic, answers, values) => {
      const playerLines = Object.entries(answers)
        .map(([side, answer]) => {
          const name = SIDE_NAMES[side] || side;
          const bp = values[side]?.battlePower || 0;
          return `${name}球员：${answer}  战斗力：${bp}`;
        })
        .join('\n');

      return `你是"NBA斗蛐蛐"的解说员。多位玩家围绕同一NBA主题各选出一位球员，已评估出战斗力。请撰写精彩的篮球群像对决解说并判定胜负。

规则：
- 战斗力 = 相关系数 × 篮球成就值，高者有优势但非必胜
- 用NBA转播解说风格，要有激情和专业术语，约600字
- 要引用真实数据和经典时刻，生动有趣
- 所有球员都要在解说中出现
- 必须判定一个胜者，不允许平局
- 最后用"【判定】红方胜/蓝方胜/绿方胜/黄方胜"结尾（根据实际参与方）

主题：${topic}
${playerLines}

请以JSON格式返回：
{
  "narrative": "<约600字NBA对决解说>",
  "winner": "red" 或 "blue" 或 "green" 或 "yellow"（战斗力最高者的side）
}`;
    },
  },
};
