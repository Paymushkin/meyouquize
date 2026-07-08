import type { Prisma } from "@prisma/client";

export type SubmitQuestionRow = Prisma.QuestionGetPayload<{
  include: { options: { orderBy: { sortOrder: "asc" } } };
}>;

const TTL_MS = 60_000;
const cacheByQuiz = new Map<string, Map<string, { at: number; question: SubmitQuestionRow }>>();

function getQuizCache(quizId: string): Map<string, { at: number; question: SubmitQuestionRow }> {
  const existing = cacheByQuiz.get(quizId);
  if (existing) return existing;
  const created = new Map<string, { at: number; question: SubmitQuestionRow }>();
  cacheByQuiz.set(quizId, created);
  return created;
}

export function getCachedSubmitQuestion(
  quizId: string,
  questionId: string,
): SubmitQuestionRow | null {
  const quizCache = cacheByQuiz.get(quizId);
  const hit = quizCache?.get(questionId);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    quizCache?.delete(questionId);
    if (quizCache && quizCache.size === 0) cacheByQuiz.delete(quizId);
    return null;
  }
  return hit.question;
}

export function setCachedSubmitQuestion(
  quizId: string,
  questionId: string,
  question: SubmitQuestionRow,
) {
  getQuizCache(quizId).set(questionId, { at: Date.now(), question });
}

export function invalidateSubmitQuestionCacheForQuiz(quizId: string) {
  cacheByQuiz.delete(quizId);
}
