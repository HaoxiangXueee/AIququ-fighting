import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnswerValues, PlayerSide, ALL_SIDES } from './types/game';
import { getTheme } from './themes/registry';

interface EvaluateResult {
  [side: string]: { relevance: number; power: number } | string;
}

interface BattleResult {
  narrative: string;
  winner: string;
  rankOrder: string[];
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
    answers: Record<string, string>,
    themeId: string,
  ): Promise<{
    values: Record<string, AnswerValues>;
    reasons: Record<string, string>;
  }> {
    const theme = getTheme(themeId);
    const prompt = theme.prompts.evaluateValues(topic, answers);

    const content = await this.callDeepSeek(prompt);
    const raw: EvaluateResult = JSON.parse(content);

    const values: Record<string, AnswerValues> = {};
    const reasons: Record<string, string> = {};

    for (const side of Object.keys(answers)) {
      const sideData = raw[side];
      const sideReason = raw[`${side}Reason`];

      if (sideData && typeof sideData === 'object') {
        const relevance = Math.max(0.1, Math.min(10, (sideData as { relevance: number }).relevance));
        const power = Math.max(5, Math.min(100, Math.round((sideData as { power: number }).power)));

        values[side] = {
          relevance: Math.round(relevance * 10) / 10,
          power,
          battlePower: Math.round(relevance * power * 10) / 10,
        };
      } else {
        values[side] = { relevance: 0.1, power: 5, battlePower: 0.5 };
      }

      reasons[side] = typeof sideReason === 'string' ? sideReason : '';
    }

    return { values, reasons };
  }

  async generateBattle(
    topic: string,
    answers: Record<string, string>,
    values: Record<string, AnswerValues>,
    themeId: string,
  ): Promise<{ narrative: string; winner: string; rankOrder: string[] }> {
    const theme = getTheme(themeId);
    const prompt = theme.prompts.generateBattle(topic, answers, values);

    const content = await this.callDeepSeek(prompt);
    const result: BattleResult = JSON.parse(content);

    // Build fallback rankOrder by battlePower descending
    const validSides = new Set(Object.keys(answers));
    const byPower = Object.keys(values)
      .filter(side => answers[side] !== undefined)
      .sort((a, b) => values[b].battlePower - values[a].battlePower);

    // Validate rankOrder from LLM: must contain exactly all valid sides, no extras
    const llmRankOrder = Array.isArray(result.rankOrder) ? result.rankOrder : [];
    const rankIsValid = llmRankOrder.length === validSides.size &&
      llmRankOrder.every(side => validSides.has(side)) &&
      new Set(llmRankOrder).size === llmRankOrder.length;

    const rankOrder = rankIsValid ? llmRankOrder : byPower;
    const winner = validSides.has(result.winner) ? result.winner : rankOrder[0];

    return {
      narrative: result.narrative,
      winner,
      rankOrder,
    };
  }
}
