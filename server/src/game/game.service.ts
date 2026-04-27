import { Injectable } from '@nestjs/common';
import { getTheme, getAvailableThemes } from './themes/registry';
import { ThemeInfo } from './themes/types';

const ROUNDS_PER_GAME = 3;
const MAX_ANSWER_LENGTH = 100;

@Injectable()
export class GameService {
  drawTopics(themeId: string): string[] {
    const theme = getTheme(themeId);
    const shuffled = [...theme.topics];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, ROUNDS_PER_GAME);
  }

  validateAnswers(answers: string[]): { valid: boolean; message?: string } {
    if (!Array.isArray(answers) || answers.length !== ROUNDS_PER_GAME) {
      return { valid: false, message: '需要提交3个答案' };
    }
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      if (typeof answer !== 'string' || answer.trim().length === 0) {
        return { valid: false, message: `第${i + 1}题答案不能为空` };
      }
      if (answer.length > MAX_ANSWER_LENGTH) {
        return { valid: false, message: `第${i + 1}题答案不能超过${MAX_ANSWER_LENGTH}字` };
      }
    }
    return { valid: true };
  }

  checkGameWinner(scores: { red: number; blue: number }): 'red' | 'blue' | null {
    if (scores.red >= 2) return 'red';
    if (scores.blue >= 2) return 'blue';
    return null;
  }

  isGameComplete(currentRound: number, scores: { red: number; blue: number }): boolean {
    // 2-0 early end
    if (scores.red >= 2 || scores.blue >= 2) return true;
    // All 3 rounds played
    if (currentRound >= ROUNDS_PER_GAME) return true;
    return false;
  }

  getAvailableThemes(): ThemeInfo[] {
    return getAvailableThemes();
  }
}
