import { useMemo } from "react";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

export function useSpeakerQuestionsSplit(questions: SpeakerQuestionItem[]) {
  return useMemo(() => {
    const hidden = questions.filter((q) => q.status === "REJECTED");
    const fresh = questions.filter((q) => q.status !== "REJECTED");
    return { hidden, fresh };
  }, [questions]);
}
