import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

/**
 * Актуальные: опубликованные админом (UI) в **активной** сессии.
 * Без activeSessionId — все user-visible (legacy).
 */
export function filterActualSpeakerQuestions(
  items: SpeakerQuestionItem[],
  activeSessionId?: string | null,
): SpeakerQuestionItem[] {
  return items.filter((item) => {
    if (!item.userVisible || item.status === "REJECTED") return false;
    if (!activeSessionId) return true;
    return item.sessionId === activeSessionId;
  });
}

/** Все вопросы текущего игрока (любые сессии). */
export function filterMySpeakerQuestions(items: SpeakerQuestionItem[]): SpeakerQuestionItem[] {
  return items.filter((item) => item.isMine);
}
