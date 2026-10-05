import { resolveMultiMaxAnswers } from "@meyouquize/shared";
import type { ActiveQuestion } from "./types";

export function getQuestionTypeLabel(question: ActiveQuestion): string {
  if (question.geoPollDictionary) return "Геоопрос";
  if (question.type === "single") return "Один ответ";
  if (question.type === "multi") {
    const optionCount = Math.max(1, question.options.length);
    const maxAnswers = resolveMultiMaxAnswers(question.maxAnswers, optionCount);
    return maxAnswers < optionCount ? `До ${maxAnswers} ответов` : "Несколько ответов";
  }
  if (question.type === "temperature") return "Измерение температуры";
  if (question.type === "ranking") return question.rankingKind === "jury" ? "Жюри" : "Ранжирование";
  return "Облако тегов";
}
