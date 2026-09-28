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
});
