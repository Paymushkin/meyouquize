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
});
