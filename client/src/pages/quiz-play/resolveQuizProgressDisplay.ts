import type { ActiveQuestion, QuizState } from "./types";

type QuizProgress = NonNullable<QuizState["quizProgress"]>;

/** Режим «все активные вопросы сразу» — только явный auto у сабквиза, не эвристика по числу active. */
export function isSubQuizAutoFlow(quizProgress: QuizProgress | null | undefined): boolean {
  return quizProgress?.questionFlowMode === "auto";
}

/** Голосования комнаты без сабквиза: несколько active, нет quizProgress. */
export function isRoomMultiActiveFlow(
  quizProgress: QuizProgress | null | undefined,
  activeCount: number,
): boolean {
  return !quizProgress && activeCount > 1;
}

export function resolveQuizProgressForQuestion(
  quizProgress: QuizProgress | null | undefined,
  questionId: string | undefined,
  activeQuestion: ActiveQuestion | null | undefined,
): QuizProgress | null {
  if (!quizProgress || !questionId) return quizProgress ?? null;

  const order = quizProgress.orderedQuestionIds;
  if (order?.length) {
    const pos = order.indexOf(questionId);
    if (pos >= 0) {
      return {
        ...quizProgress,
        index: pos + 1,
        total: order.length,
      };
    }
  }

  if (
    activeQuestion?.id === questionId &&
    typeof activeQuestion.stepIndex === "number" &&
    activeQuestion.stepIndex > 0
  ) {
    return {
      ...quizProgress,
      index: activeQuestion.stepIndex,
      total: activeQuestion.stepTotal ?? quizProgress.total,
    };
  }

  if (activeQuestion?.id === questionId) {
    return quizProgress;
  }

  return quizProgress;
}
