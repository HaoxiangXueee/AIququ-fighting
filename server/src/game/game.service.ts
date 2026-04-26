import { Injectable } from '@nestjs/common';

export const TOPIC_POOL = [
  '最经典的FPS游戏',
  '最感人的游戏剧情',
  '最肝的游戏',
  '最好玩的开放世界游戏',
  '最恐怖的生存游戏',
  '最好看的游戏女角色',
  '最帅的游戏男角色',
  '最想穿越进去的游戏世界',
  '最被低估的神作',
  '最让人破防的游戏结局',
  '最爽的战斗系统',
  '最经典的游戏BOSS',
  '最适合联机的游戏',
  '最有氛围感的游戏',
  '最想改编成电影的游戏',
];

const ROUNDS_PER_GAME = 3;
const MAX_ANSWER_LENGTH = 100;

@Injectable()
export class GameService {
  drawTopics(): string[] {
    const shuffled = [...TOPIC_POOL];
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
}
