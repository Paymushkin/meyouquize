import { parseTagCloudReferenceAliases } from "@meyouquize/shared";
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

export type TagCloudReferenceTag = {
  /** Нормализованные синонимы одного эталонного тега (например «синий» и «голубой»). */
  comparables: string[];
  points: number;
};

/** JSON-массив баллов по индексу варианта (облако тегов и ранжирование). */
export function parseTagCloudTierPoints(raw: unknown): number[] | null {
  if (raw == null || !Array.isArray(raw)) return null;
  const out: number[] = [];
  for (const x of raw) {
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    const t = Math.trunc(x);
    if (t < 0 || t > 10_000) return null;
    out.push(t);
  }
  return out.length > 0 ? out : null;
}

export function buildTagCloudReferenceTags(
  options: Array<{ text: string; isCorrect: boolean }>,
  tiers: number[] | null | undefined,
): TagCloudReferenceTag[] {
  const referenceTags: TagCloudReferenceTag[] = [];
  options.forEach((o, idx) => {
    if (!o.isCorrect) return;
    const comparables = parseTagCloudReferenceAliases(o.text);
    if (comparables.length === 0) return;
    referenceTags.push({
      comparables,
      points: Math.max(0, tiers?.[idx] ?? 1),
    });
  });
  return referenceTags;
}

export function evaluateTagCloudSubmission(input: {
  referenceTags: TagCloudReferenceTag[];
  userTagsComparable: string[];
  maxAnswers: number;
  fullCreditPoints: number;
  scoringMode: "quiz" | "poll";
}): { isCorrect: boolean; scoreAwarded: number } {
  if (input.scoringMode === "quiz") {
    const scored = scoreTagCloudQuizAnswer(
      input.referenceTags,
      input.userTagsComparable,
      input.maxAnswers,
      input.fullCreditPoints,
    );
    return { isCorrect: scored.isCorrect, scoreAwarded: scored.scoreAwarded };
  }
  const userSet = new Set(input.userTagsComparable);
  const isCorrect = input.referenceTags.some((r) => r.comparables.some((c) => userSet.has(c)));
  return { isCorrect, scoreAwarded: 0 };
}

/**
 * Облако тегов (квиз): за каждый верный эталонный тег — баллы из настроек;
 * синонимы в одной строке («синий; голубой») засчитываются как один эталон;
 * если участник заполнил все слоты (maxAnswers) и все ответы верные — поле `points` вопроса.
 */
export function scoreTagCloudQuizAnswer(
  referenceTags: TagCloudReferenceTag[],
  userTagsComparable: string[],
  maxAnswers: number,
  fullCreditPoints: number,
): { scoreAwarded: number; isCorrect: boolean } {
  const uniqueUser = [...new Set(userTagsComparable.filter(Boolean))];
  if (uniqueUser.length === 0) {
    return { scoreAwarded: 0, isCorrect: false };
  }

  const satisfiedGroups = new Set<number>();
  let partialSum = 0;
  let matchedUserTags = 0;

  for (const tag of uniqueUser) {
    let matched = false;
    for (let i = 0; i < referenceTags.length; i += 1) {
      if (satisfiedGroups.has(i)) continue;
      const ref = referenceTags[i]!;
      if (ref.comparables.includes(tag)) {
        satisfiedGroups.add(i);
        partialSum += Math.max(0, ref.points);
        matchedUserTags += 1;
        matched = true;
        break;
      }
    }
  }

  const maxSlots = Math.max(1, Math.trunc(maxAnswers));
  const allSubmittedAreCorrect = matchedUserTags === uniqueUser.length;
  const fullCredit =
    allSubmittedAreCorrect && uniqueUser.length === maxSlots && satisfiedGroups.size === maxSlots;

  if (fullCredit) {
    return { scoreAwarded: Math.max(0, fullCreditPoints), isCorrect: true };
  }
  return { scoreAwarded: partialSum, isCorrect: false };
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
