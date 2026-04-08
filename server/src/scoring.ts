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
