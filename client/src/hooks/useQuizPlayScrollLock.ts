import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { QuizState } from "../pages/quiz-play/types";

type Params = {
  joined: boolean;
  quiz: QuizState | null;
  subQuizCompleteOpen: boolean;
  finalCompletionDismissed: boolean;
  lastSubQuizProgressRef: MutableRefObject<{
    questionId: string;
    index: number;
    total: number;
  } | null>;
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
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
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
    const lockScroll = !joined || (joined && !inQuestionFlow);
    const scrollY = window.scrollY;
    document.body.style.overflowY = lockScroll ? "hidden" : "auto";
    document.documentElement.style.overflowY = lockScroll ? "hidden" : "auto";
    document.body.style.overscrollBehaviorY = lockScroll ? "none" : "";
    document.documentElement.style.overscrollBehaviorY = lockScroll ? "none" : "";
    if (lockScroll) {
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflowY = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.documentElement.style.overscrollBehaviorY = prevHtmlOverscroll;
      if (lockScroll) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [joined, quiz, subQuizCompleteOpen, finalCompletionDismissed, lastSubQuizProgressRef]);
}
