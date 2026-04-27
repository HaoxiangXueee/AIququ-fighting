import { ThemeDefinition } from './types';

const SIDE_NAMES: Record<string, string> = {
  red: '红方',
  blue: '蓝方',
  green: '绿方',
  yellow: '黄方',
};

export const GAME_THEME: ThemeDefinition = {
  id: 'game',
  name: '游戏',
  description: '电子游戏世界的巅峰对决',
  icon: '🎮',

  topics: [
    // ===== 剧情 & 角色 =====
    '拥有最感人剧情的游戏',
    '拥有最让人破防结局的游戏',
    '拥有最优秀群像塑造的游戏',
    '拥有最帅男角色的游戏',
    '拥有最好看女角色的游戏',
    '拥有最让人恨之入骨反派的游戏',
    '拥有最意难平角色命运的游戏',
    '拥有最佳多结局设计的游戏',
    '拥有最成功反转剧情的游戏',
    '拥有最深刻道德抉择的游戏',

    // ===== 玩法 & 系统 =====
    '拥有最爽战斗系统的游戏',
    '拥有最经典BOSS战的游戏',
    '拥有最肝的游戏',
    '拥有最佳技能树/天赋系统的游戏',
    '拥有最上瘾刷刷刷机制的游戏',
    '拥有最硬核操作要求的游戏',
    '拥有最丰富建造系统的游戏',
    '拥有最佳潜行玩法的游戏',
    '拥有最爽快割草体验的游戏',
    '拥有最有趣职业/角色切换系统的游戏',

    // ===== 类型标杆 =====
    '最经典的FPS游戏',
    '最好玩的开放世界游戏',
    '最恐怖的生存游戏',
    '最适合联机的游戏',
    '最被低估的神作游戏',
    '最适合速通的游戏',
    '最佳肉鸽/roguelike游戏',
    '最佳国产单机游戏',
    '最佳日式RPG游戏',
    '最佳策略/战棋游戏',
    '最佳文字冒险/视觉小说游戏',
    '最佳模拟经营游戏',
    '最佳动作冒险游戏',
    '最佳赛车/驾驶游戏',
    '最佳格斗/对战游戏',

    // ===== 世界 & 氛围 =====
    '最想穿越进去其世界观的游戏',
    '最有氛围感的游戏',
    '拥有最壮观场景的游戏',
    '拥有最佳地图设计的游戏',
    '拥有最丰富背景设定的游戏',
    '拥有最生动NPC的游戏',
    '拥有最佳水下场景的游戏',
    '拥有最佳末日氛围的游戏',
    '拥有最迷人奇幻世界的游戏',
    '拥有最沉浸恐怖氛围的游戏',

    // ===== 视听 & 体验 =====
    '拥有最佳配乐的游戏',
    '拥有最佳美术风格的游戏',
    '拥有最佳UI设计的游戏',
    '最想改编成电影的游戏',
    '最适合放松解压的游戏',
  ],

  prompts: {
    evaluateValues: (topic, answers) => {
      const answerLines = Object.entries(answers)
        .map(([side, answer]) => `${SIDE_NAMES[side] || side}答案：${answer}`)
        .join('\n');

      const resultFields = Object.keys(answers)
        .map(side => {
          const name = SIDE_NAMES[side] || side;
          return `  "${side}": { "relevance": <0.1-10保留一位小数>, "power": <5-100整数> },\n  "${side}Reason": "<一句话说明${name}评分理由>"`;
        })
        .join(',\n');

      return `你是一个斗蛐蛐游戏的裁判。多位玩家针对同一个主题给出答案，请评估每个答案：

1. 相关系数 (0.1-10)：答案与主题的相关程度。完全跑题0.1，勉强相关2-3，比较相关4-6，高度相关7-8，完美契合9-10。
2. 夯度/力度 (5-100)：答案的"战斗力"，考虑知名度、影响力、经典程度。冷门5-20，一般21-40，较知名41-60，高度知名61-80，殿堂级81-100。

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
          return `${name}答案：${answer}  战斗力：${bp}`;
        })
        .join('\n');

      return `你是斗蛐蛐游戏的解说员。多位玩家围绕同一主题给出答案，已评估出战斗力。请撰写精彩的群像混战解说并判定胜负。

规则：
- 战斗力 = 相关系数 × 夯度，高者有优势但非必胜
- 解说要生动有趣，带游戏圈梗和比喻，约600字
- 所有玩家的答案都要在故事中出现
- 必须判定一个胜者，不允许平局
- 最后用"【判定】红方胜/蓝方胜/绿方胜/黄方胜"结尾（根据实际参与方）

主题：${topic}
${playerLines}

请以JSON格式返回：
{
  "narrative": "<约600字战斗解说>",
  "winner": "red" 或 "blue" 或 "green" 或 "yellow"（战斗力最高者的side）
}`;
    },
  },
};
