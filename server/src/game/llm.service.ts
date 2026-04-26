import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnswerValues } from './types/game';

interface EvaluateResult {
  red: { relevance: number; power: number };
  blue: { relevance: number; power: number };
  redReason: string;
  blueReason: string;
}

interface BattleResult {
  narrative: string;
  winner: 'red' | 'blue';
}

@Injectable()
export class LlmService {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/chat/completions';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
  }

  private async callDeepSeek(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async evaluateValues(
    topic: string,
    redAnswer: string,
    blueAnswer: string,
  ): Promise<{
    red: AnswerValues;
    blue: AnswerValues;
    redReason: string;
    blueReason: string;
  }> {
    const prompt = `你是一个斗蛐蛐游戏的裁判。两位玩家针对同一个主题给出答案，请评估每个答案：

1. 相关系数 (0.1-10)：答案与主题的相关程度。完全跑题0.1，勉强相关2-3，比较相关4-6，高度相关7-8，完美契合9-10。
2. 夯度/力度 (5-100)：答案的"战斗力"，考虑知名度、影响力、经典程度。冷门5-20，一般21-40，较知名41-60，高度知名61-80，殿堂级81-100。

主题：${topic}
红方答案：${redAnswer}
蓝方答案：${blueAnswer}

请以JSON格式返回，不要包含其他文字：
{
  "red": { "relevance": <0.1-10保留一位小数>, "power": <5-100整数> },
  "blue": { "relevance": <0.1-10保留一位小数>, "power": <5-100整数> },
  "redReason": "<一句话说明红方评分理由>",
  "blueReason": "<一句话说明蓝方评分理由>"
}`;

    const content = await this.callDeepSeek(prompt);
    const result: EvaluateResult = JSON.parse(content);

    const redRelevance = Math.max(0.1, Math.min(10, result.red.relevance));
    const redPower = Math.max(5, Math.min(100, Math.round(result.red.power)));
    const blueRelevance = Math.max(0.1, Math.min(10, result.blue.relevance));
    const bluePower = Math.max(5, Math.min(100, Math.round(result.blue.power)));

    return {
      red: {
        relevance: Math.round(redRelevance * 10) / 10,
        power: redPower,
        battlePower: Math.round(redRelevance * redPower * 10) / 10,
      },
      blue: {
        relevance: Math.round(blueRelevance * 10) / 10,
        power: bluePower,
        battlePower: Math.round(blueRelevance * bluePower * 10) / 10,
      },
      redReason: result.redReason,
      blueReason: result.blueReason,
    };
  }

  async generateBattle(
    topic: string,
    redAnswer: string,
    blueAnswer: string,
    redValues: AnswerValues,
    blueValues: AnswerValues,
  ): Promise<{ narrative: string; winner: 'red' | 'blue' }> {
    const prompt = `你是斗蛐蛐游戏的解说员。两位玩家围绕同一主题给出答案，已评估出战斗力。请撰写精彩对战解说并判定胜负。

规则：
- 战斗力 = 相关系数 × 夯度，高者有优势但非必胜
- 解说要生动有趣，带游戏圈梗和比喻，约500字
- 必须判定一个胜者，不允许平局
- 最后用"【判定】红方胜/蓝方胜"结尾

主题：${topic}
红方答案：${redAnswer}  战斗力：${redValues.battlePower}
蓝方答案：${blueAnswer}  战斗力：${blueValues.battlePower}

请以JSON格式返回：
{
  "narrative": "<约500字战斗解说>",
  "winner": "red" 或 "blue"
}`;

    const content = await this.callDeepSeek(prompt);
    const result: BattleResult = JSON.parse(content);

    return {
      narrative: result.narrative,
      winner: result.winner === 'red' ? 'red' : 'blue',
    };
  }
}
