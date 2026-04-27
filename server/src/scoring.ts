import { QuestionType } from "@prisma/client";

export interface ScoringQuestionOption {
  id: string;
  isCorrect: boolean;
}

export interface ScoringQuestion {
  type: QuestionType;
  options: ScoringQuestionOption[];
}

function normalizeSelection(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

export function evaluateAnswer(question: ScoringQuestion, selectedOptionIds: string[]): boolean {
  const correctIds = normalizeSelection(
    question.options.filter((o) => o.isCorrect).map((o) => o.id),
  );
  const selected = normalizeSelection(selectedOptionIds);
  if (question.type === QuestionType.SINGLE && selected.length !== 1) {
    return false;
  }
  return JSON.stringify(correctIds) === JSON.stringify(selected);
}

/** Полное совпадение перестановки с эталоном (порядок важен, сортировать нельзя). */
export function evaluateRankingAnswer(correctOrder: string[], submitted: string[]): boolean {
  if (correctOrder.length !== submitted.length) return false;
  const set = new Set(correctOrder);
  if (set.size !== correctOrder.length) return false;
  for (const id of submitted) {
    if (!set.has(id)) return false;
  }
  return correctOrder.every((id, i) => id === submitted[i]);
}

/** Сумма баллов за совпадение id на каждой позиции с эталоном (частичные баллы). */
export function scoreRankingByPositionMatch(
  correctOrder: string[],
  submitted: string[],
  tierPoints: number[],
): number {
  if (correctOrder.length !== submitted.length || tierPoints.length !== correctOrder.length) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (submitted[i] === correctOrder[i]) {
      sum += tierPoints[i] ?? 0;
    }
  }
  return sum;
}
