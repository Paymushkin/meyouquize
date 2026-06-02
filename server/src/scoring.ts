import { parseTagCloudReferenceAliases } from "@meyouquize/shared";
import { QuestionType } from "@prisma/client";

export interface ScoringQuestionOption {
  id: string;
  isCorrect: boolean;
}

export interface ScoringQuestion {
  type: QuestionType;
  options: ScoringQuestionOption[];
  acceptAnyAnswerAsCorrect?: boolean;
}

function normalizeSelection(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

export function evaluateAnswer(question: ScoringQuestion, selectedOptionIds: string[]): boolean {
  if (question.acceptAnyAnswerAsCorrect) {
    if (question.type === QuestionType.SINGLE) return selectedOptionIds.length === 1;
    return selectedOptionIds.length > 0;
  }
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

/** Режим зачёта облака тегов: в подквизе всегда квиз (даже если в БД остался legacy POLL). */
export function resolveTagCloudScoringContext(question: {
  isTagCloud: boolean;
  scoringModeQuiz: boolean;
  inSubQuiz: boolean;
}): { scoringMode: "quiz" | "poll"; referenceScope: "quiz-all" | "correct-flag" } {
  const isQuiz = question.isTagCloud && (question.scoringModeQuiz || question.inSubQuiz);
  if (!isQuiz) {
    return { scoringMode: "poll", referenceScope: "correct-flag" };
  }
  return { scoringMode: "quiz", referenceScope: "quiz-all" };
}

export function buildTagCloudReferenceTags(
  options: Array<{ text: string; isCorrect: boolean }>,
  tiers: number[] | null | undefined,
  /** В квизе каждый непустой вариант — эталон; в опросе — только с isCorrect. */
  referenceScope: "quiz-all" | "correct-flag" = "correct-flag",
): TagCloudReferenceTag[] {
  const referenceTags: TagCloudReferenceTag[] = [];
  options.forEach((o, idx) => {
    if (referenceScope === "correct-flag" && !o.isCorrect) return;
    if (!o.text.trim()) return;
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
 * Облако тегов (квиз): синонимы в одной строке эталона («а; б») — одна группа.
 * Частично: баллы за каждую впервые закрытую группу (повтор синонима той же группы не суммируется).
 * Полный ответ (`points` вопроса): ровно maxAnswers слотов, каждый тег верный и из своей группы,
 * причём все maxAnswers групп разные (нельзя «вольная» + «вольная борьба» + «дзюдо» при max=3).
 */
export function scoreTagCloudQuizAnswer(
  referenceTags: TagCloudReferenceTag[],
  userTagsComparable: string[],
  maxAnswers: number,
  fullCreditPoints: number,
): { scoreAwarded: number; isCorrect: boolean } {
  const userTags = userTagsComparable.map((t) => t.trim()).filter(Boolean);
  if (userTags.length === 0) {
    return { scoreAwarded: 0, isCorrect: false };
  }

  const maxSlots = Math.max(1, Math.trunc(maxAnswers));
  const groupIndexBySlot: number[] = [];

  for (const tag of userTags) {
    let groupIdx = -1;
    for (let i = 0; i < referenceTags.length; i += 1) {
      if (referenceTags[i]!.comparables.includes(tag)) {
        groupIdx = i;
        break;
      }
    }
    groupIndexBySlot.push(groupIdx);
  }

  const satisfiedGroups = new Set<number>();
  let partialSum = 0;
  for (let slot = 0; slot < userTags.length; slot += 1) {
    const groupIdx = groupIndexBySlot[slot]!;
    if (groupIdx < 0) continue;
    if (satisfiedGroups.has(groupIdx)) continue;
    satisfiedGroups.add(groupIdx);
    partialSum += Math.max(0, referenceTags[groupIdx]!.points);
  }

  const allSlotsMatchReference = groupIndexBySlot.every((g) => g >= 0);
  const distinctGroupsUsed = new Set(groupIndexBySlot.filter((g) => g >= 0));
  const fullCredit =
    userTags.length === maxSlots && allSlotsMatchReference && distinctGroupsUsed.size === maxSlots;

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
