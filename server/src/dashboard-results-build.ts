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
