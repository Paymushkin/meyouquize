import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { QuizState } from "../pages/quiz-play/types";

type Params = {
  slug: string;
  joined: boolean;
  quiz: QuizState | null;
  submittedQuestionIds: string[];
  lastSubQuizProgressRef: MutableRefObject<{
    questionId: string;
    index: number;
    total: number;
  } | null>;
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
  const prevActiveQuestionIdRef = useRef<string | null>(null);
  /** Не показывать авто-завершение повторно после того же ответа на последний вопрос (state:quiz refresh). */
  const playerCompleteShownKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setFinalCompletionDismissed(false);
    setSubQuizCompleteOpen(false);
    prevActiveQuestionIdRef.current = null;
    playerCompleteShownKeyRef.current = null;
  }, [slug]);

  useEffect(() => {
    playerCompleteShownKeyRef.current = null;
  }, [quiz?.activeQuestion?.id]);

  useEffect(() => {
    const nextActiveQuestionId = quiz?.activeQuestion?.id ?? null;
    const prevActiveQuestionId = prevActiveQuestionIdRef.current;

    if (nextActiveQuestionId && nextActiveQuestionId !== prevActiveQuestionId) {
      setSubQuizCompleteOpen(false);
      setFinalCompletionDismissed(false);
      playerCompleteShownKeyRef.current = null;
    } else if (prevActiveQuestionId && !nextActiveQuestionId) {
      const prog = lastSubQuizProgressRef.current;
      if (
        quiz?.status !== "FINISHED" &&
        prog &&
        prog.questionId === prevActiveQuestionId &&
        prog.index === prog.total
      ) {
        setSubQuizCompleteOpen(true);
      }
    }

    prevActiveQuestionIdRef.current = nextActiveQuestionId;
  }, [quiz?.activeQuestion?.id, quiz?.status, lastSubQuizProgressRef]);

  useLayoutEffect(() => {
    if (finalCompletionDismissed) return;
    if (!quiz || quiz.status === "FINISHED" || !quiz.activeQuestion?.id || !quiz.quizProgress)
      return;
    if (quiz.quizProgress.total < 1) return;
    if (quiz.quizProgress.index !== quiz.quizProgress.total) return;
    if (!submittedQuestionIds.includes(quiz.activeQuestion.id)) return;

    const completeKey = `${quiz.activeQuestion.id}:${quiz.quizProgress.index}/${quiz.quizProgress.total}`;
    if (playerCompleteShownKeyRef.current === completeKey) return;
    playerCompleteShownKeyRef.current = completeKey;
    setSubQuizCompleteOpen(true);
  }, [
    finalCompletionDismissed,
    quiz?.status,
    quiz?.activeQuestion?.id,
    quiz?.quizProgress?.index,
    quiz?.quizProgress?.total,
    submittedQuestionIds,
  ]);

  if (quiz?.activeQuestion?.id && quiz.quizProgress && quiz.quizProgress.total > 0) {
    lastSubQuizProgressRef.current = {
      questionId: quiz.activeQuestion.id,
      index: quiz.quizProgress.index,
      total: quiz.quizProgress.total,
    };
  }

  const showSubQuizComplete = joined && !!quiz && quiz.status !== "FINISHED" && subQuizCompleteOpen;

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
    setFinalCompletionDismissed: (value: boolean) => {
      if (value) {
        const activeId = quiz?.activeQuestion?.id;
        const progress = quiz?.quizProgress;
        if (activeId && progress && progress.total > 0) {
          playerCompleteShownKeyRef.current = `${activeId}:${progress.index}/${progress.total}`;
        }
      }
      setFinalCompletionDismissed(value);
    },
    showSubQuizCompleteCard,
    showFinishedCompletionCard,
    showIdleWaiting,
    hasActiveQuestion,
  };
}
