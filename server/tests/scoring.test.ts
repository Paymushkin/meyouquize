import { describe, expect, it } from "vitest";
import { QuestionType } from "@prisma/client";
import { evaluateAnswer } from "../src/scoring.js";

describe("evaluateAnswer", () => {
  it("validates single-choice question", () => {
    const question = {
      type: QuestionType.SINGLE,
      options: [
        { id: "a", isCorrect: true },
        { id: "b", isCorrect: false },
      ],
    };
    expect(evaluateAnswer(question, ["a"])).toBe(true);
    expect(evaluateAnswer(question, ["b"])).toBe(false);
    expect(evaluateAnswer(question, ["a", "b"])).toBe(false);
  });

  it("validates multi-choice question", () => {
    const question = {
      type: QuestionType.MULTI,
      options: [
        { id: "a", isCorrect: true },
        { id: "b", isCorrect: true },
        { id: "c", isCorrect: false },
      ],
    };
    expect(evaluateAnswer(question, ["a", "b"])).toBe(true);
    expect(evaluateAnswer(question, ["a"])).toBe(false);
    expect(evaluateAnswer(question, ["a", "c"])).toBe(false);
  });
});
