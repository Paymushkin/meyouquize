import type { Prisma } from "@prisma/client";

export type SubmitQuestionRow = Prisma.QuestionGetPayload<{
  include: { options: { orderBy: { sortOrder: "asc" } } };
}>;

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; question: SubmitQuestionRow }>();

function cacheKey(quizId: string, questionId: string) {
  return `${quizId}:${questionId}`;
}

export function getCachedSubmitQuestion(
  quizId: string,
  questionId: string,
): SubmitQuestionRow | null {
  const hit = cache.get(cacheKey(quizId, questionId));
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(cacheKey(quizId, questionId));
    return null;
  }
  return hit.question;
}

export function setCachedSubmitQuestion(
  quizId: string,
  questionId: string,
  question: SubmitQuestionRow,
) {
  cache.set(cacheKey(quizId, questionId), { at: Date.now(), question });
}

export function invalidateSubmitQuestionCacheForQuiz(quizId: string) {
  const prefix = `${quizId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
