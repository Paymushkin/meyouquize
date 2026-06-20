import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

/** Вопросы, опубликованные админом для всех игроков (переключатель UI). */
export function filterActualSpeakerQuestions(items: SpeakerQuestionItem[]): SpeakerQuestionItem[] {
  return items.filter((item) => item.userVisible && item.status !== "REJECTED");
}

/** Все вопросы текущего игрока. */
export function filterMySpeakerQuestions(items: SpeakerQuestionItem[]): SpeakerQuestionItem[] {
  return items.filter((item) => item.isMine);
}
