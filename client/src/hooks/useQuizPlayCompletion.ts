import { useEffect, useLayoutEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { QuizState } from "../pages/quiz-play/types";

type Params = {
  slug: string;
  joined: boolean;
  quiz: QuizState | null;
  submittedQuestionIds: string[];
  lastSubQuizProgressRef: MutableRefObject<{ questionId: string; index: number; total: number } | null>;
};

export function useQuizPlayCompletion({
  slug,
  joined,
  quiz,
  submittedQuestionIds,
  lastSubQuizProgressRef,
}: Params) {
  const [subQuizCompleteOpen, setSubQuizCompleteOpen] = useState(false);
  const [finalCompletionDismissed, setFinalCompletionDismissed] = useState(false);

  useEffect(() => {
    setFinalCompletionDismissed(false);
  }, [slug]);

  useEffect(() => {
    setSubQuizCompleteOpen(false);
    if (quiz?.activeQuestion?.id) {
      setFinalCompletionDismissed(false);
    }
  }, [quiz?.activeQuestion?.id]);

  useLayoutEffect(() => {
    if (!quiz || quiz.status === "FINISHED" || !quiz.activeQuestion?.id || !quiz.quizProgress) return;
    if (quiz.quizProgress.total < 1) return;
    if (quiz.quizProgress.index !== quiz.quizProgress.total) return;
    if (!submittedQuestionIds.includes(quiz.activeQuestion.id)) return;
    setSubQuizCompleteOpen(true);
  }, [quiz, submittedQuestionIds]);

  if (quiz?.activeQuestion?.id && quiz.quizProgress && quiz.quizProgress.total > 0) {
    lastSubQuizProgressRef.current = {
      questionId: quiz.activeQuestion.id,
      index: quiz.quizProgress.index,
      total: quiz.quizProgress.total,
    };
  }

  const completionAfterAdmin =
    joined &&
    !!quiz &&
    quiz.status !== "FINISHED" &&
    !quiz.activeQuestion &&
    lastSubQuizProgressRef.current !== null &&
    lastSubQuizProgressRef.current.index === lastSubQuizProgressRef.current.total;

  const showSubQuizComplete =
    joined &&
    !!quiz &&
    quiz.status !== "FINISHED" &&
    (subQuizCompleteOpen || completionAfterAdmin);

  const showSubQuizCompleteCard = showSubQuizComplete && !finalCompletionDismissed;
  const showFinishedCompletionCard =
    joined &&
    !!quiz &&
    quiz.status === "FINISHED" &&
    !quiz.activeQuestion &&
    !finalCompletionDismissed;
  const showIdleWaiting =
    joined &&
    !!quiz &&
    !quiz.activeQuestion &&
    !showSubQuizCompleteCard &&
    !showFinishedCompletionCard;
  const hasActiveQuestion = joined && !!quiz?.activeQuestion && !showSubQuizCompleteCard;

  return {
    subQuizCompleteOpen,
    setSubQuizCompleteOpen,
    finalCompletionDismissed,
    setFinalCompletionDismissed,
    showSubQuizCompleteCard,
    showFinishedCompletionCard,
    showIdleWaiting,
    hasActiveQuestion,
  };
}
