import type { ActiveQuestion } from "./types";

export function getQuestionTypeLabel(question: ActiveQuestion): string {
  if (question.type === "single") return "Один ответ";
  if (question.type === "multi") return "Несколько ответов";
  if (question.type === "temperature") return "Измерение температуры";
  if (question.type === "ranking") return question.rankingKind === "jury" ? "Жюри" : "Ранжирование";
  return "Облако тегов";
}
