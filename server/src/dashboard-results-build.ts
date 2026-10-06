export type DashboardAnswerRow = {
  questionId: string;
  selectedOptionIds: string;
};

/** Группирует плоский список ответов по questionId (один запрос вместо N вложенных). */
export function groupAnswersByQuestionId(
  rows: DashboardAnswerRow[],
): Map<string, Array<{ selectedOptionIds: string }>> {
  const map = new Map<string, Array<{ selectedOptionIds: string }>>();
  for (const row of rows) {
    let list = map.get(row.questionId);
    if (!list) {
      list = [];
      map.set(row.questionId, list);
    }
    list.push({ selectedOptionIds: row.selectedOptionIds });
  }
  return map;
}

export function attachAnswersToQuestions<T extends { id: string }>(
  questions: T[],
  answersByQuestion: Map<string, Array<{ selectedOptionIds: string }>>,
) {
  return questions.map((q) => ({
    ...q,
    answers: answersByQuestion.get(q.id) ?? [],
  }));
}

/** Последний schedule «выигрывает»: токен в Redis должен совпасть с локальным. */
export function isDashboardDebounceTokenCurrent(
  scheduledToken: string,
  redisToken: string | null,
): boolean {
  return redisToken === scheduledToken;
}

/**
 * Trailing debounce, но не дольше maxWait от первого submit во всплеске.
 * maxWaitMs <= 0 — только debounce (старое поведение).
 */
export function dashboardBroadcastDelayMs(
  debounceMs: number,
  maxWaitMs: number,
  burstElapsedMs: number,
): number {
  const debounce = Math.max(0, debounceMs);
  const maxWait = Math.max(0, maxWaitMs);
  if (maxWait <= 0) return debounce;
  const remaining = maxWait - Math.max(0, burstElapsedMs);
  if (remaining <= 0) return 0;
  return Math.min(debounce, remaining);
}
