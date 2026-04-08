import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { QuizState } from "../pages/quiz-play/types";

type Params = {
  joined: boolean;
  quiz: QuizState | null;
  subQuizCompleteOpen: boolean;
  finalCompletionDismissed: boolean;
  lastSubQuizProgressRef: MutableRefObject<{ questionId: string; index: number; total: number } | null>;
};

export function useQuizPlayScrollLock({
  joined,
  quiz,
  subQuizCompleteOpen,
  finalCompletionDismissed,
  lastSubQuizProgressRef,
}: Params) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflowY;
    const prevHtmlOverflow = document.documentElement.style.overflowY;
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
    const inQuestionFlow = joined && !!quiz?.activeQuestion && !showSubQuizCompleteCard;
    const lockScroll = joined && !inQuestionFlow;
    document.body.style.overflowY = lockScroll ? "hidden" : "auto";
    document.documentElement.style.overflowY = lockScroll ? "hidden" : "auto";
    return () => {
      document.body.style.overflowY = prevBodyOverflow;
      document.documentElement.style.overflowY = prevHtmlOverflow;
    };
  }, [joined, quiz, subQuizCompleteOpen, finalCompletionDismissed]);
}
