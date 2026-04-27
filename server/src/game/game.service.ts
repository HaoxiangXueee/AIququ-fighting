import { Injectable } from '@nestjs/common';
import { getTheme, getAvailableThemes } from './themes/registry';
import { ThemeInfo } from './themes/types';
import { PlayerSide, ALL_SIDES } from './types/game';

const MAX_ANSWER_LENGTH = 100;

@Injectable()
export class GameService {
  drawTopics(themeId: string, totalRounds: number): string[] {
    const theme = getTheme(themeId);
    const shuffled = [...theme.topics];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, totalRounds);
  }

  validateAnswers(answers: string[], totalRounds: number): { valid: boolean; message?: string } {
    if (!Array.isArray(answers) || answers.length !== totalRounds) {
      return { valid: false, message: `需要提交${totalRounds}个答案` };
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

  // Winner = most wins; tiebreak by totalBattlePower
  checkGameWinner(
    scores: Record<PlayerSide, number>,
    totalBattlePower: Record<PlayerSide, number>,
    activeSides: PlayerSide[],
  ): PlayerSide | null {
    let maxWins = -1;
    let candidates: PlayerSide[] = [];

    for (const side of activeSides) {
      const wins = scores[side];
      if (wins > maxWins) {
        maxWins = wins;
        candidates = [side];
      } else if (wins === maxWins) {
        candidates.push(side);
      }
    }

    if (candidates.length === 0) return null;

    if (candidates.length === 1) return candidates[0];

    // Tiebreak by totalBattlePower
    let maxPower = -1;
    let winner: PlayerSide | null = null;
    for (const side of candidates) {
      const power = totalBattlePower[side];
      if (power > maxPower) {
        maxPower = power;
        winner = side;
      }
    }

    return winner;
  }

  isGameComplete(currentRound: number, totalRounds: number): boolean {
    // All rounds must be played — no early end in multiplayer
    return currentRound >= totalRounds - 1;
  }

  getAvailableThemes(): ThemeInfo[] {
    return getAvailableThemes();
  }
}
