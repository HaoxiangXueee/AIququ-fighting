import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnswerValues } from './types/game';
import { getTheme } from './themes/registry';

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
    themeId: string,
  ): Promise<{
    red: AnswerValues;
    blue: AnswerValues;
    redReason: string;
    blueReason: string;
  }> {
    const theme = getTheme(themeId);
    const prompt = theme.prompts.evaluateValues(topic, redAnswer, blueAnswer);

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
    themeId: string,
  ): Promise<{ narrative: string; winner: 'red' | 'blue' }> {
    const theme = getTheme(themeId);
    const prompt = theme.prompts.generateBattle(topic, redAnswer, blueAnswer, redValues, blueValues);

    const content = await this.callDeepSeek(prompt);
    const result: BattleResult = JSON.parse(content);

    return {
      narrative: result.narrative,
      winner: result.winner === 'red' ? 'red' : 'blue',
    };
  }
}
