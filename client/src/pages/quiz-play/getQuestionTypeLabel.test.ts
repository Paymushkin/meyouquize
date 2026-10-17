import { describe, expect, it } from "vitest";
import { getQuestionTypeLabel } from "./getQuestionTypeLabel";
import type { ActiveQuestion } from "./types";

describe("getQuestionTypeLabel", () => {
  it("labels temperature questions", () => {
    const question = {
      id: "q1",
      text: "Насколько вам понравилось?",
      type: "temperature",
      options: [],
      isClosed: false,
    } satisfies ActiveQuestion;
    expect(getQuestionTypeLabel(question)).toBe("Измерение температуры");
  });

  it("labels geo poll questions", () => {
    const question = {
      id: "q-geo",
      text: "Откуда вы?",
      type: "single",
      options: [],
      isClosed: false,
      geoPollDictionary: "world_cities",
    } satisfies ActiveQuestion;
    expect(getQuestionTypeLabel(question)).toBe("Геоопрос");
  });

  it("labels multi with answer limit", () => {
    const question = {
      id: "q-multi",
      text: "Выберите варианты",
      type: "multi",
      maxAnswers: 2,
      options: [
        { id: "o1", text: "A" },
        { id: "o2", text: "B" },
        { id: "o3", text: "C" },
      ],
      isClosed: false,
    } satisfies ActiveQuestion;
    expect(getQuestionTypeLabel(question)).toBe("До 2 ответов");
  });

  it("labels legacy multi maxAnswers=1 as unlimited", () => {
    const question = {
      id: "q-multi-legacy",
      text: "Выберите варианты",
      type: "multi",
      maxAnswers: 1,
      options: [
        { id: "o1", text: "A" },
        { id: "o2", text: "B" },
        { id: "o3", text: "C" },
      ],
      isClosed: false,
    } satisfies ActiveQuestion;
    expect(getQuestionTypeLabel(question)).toBe("Несколько ответов");
  });
});
