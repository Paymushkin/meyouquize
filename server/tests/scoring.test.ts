import { describe, expect, it } from "vitest";
import { QuestionType } from "@prisma/client";
import {
  evaluateAnswer,
  evaluateRankingAnswer,
  scoreRankingByPositionMatch,
} from "../src/scoring.js";

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

describe("evaluateRankingAnswer", () => {
  it("returns true only for exact order match", () => {
    const correct = ["a", "b", "c"];
    expect(evaluateRankingAnswer(correct, ["a", "b", "c"])).toBe(true);
    expect(evaluateRankingAnswer(correct, ["c", "b", "a"])).toBe(false);
    expect(evaluateRankingAnswer(correct, ["a", "c", "b"])).toBe(false);
  });

  it("rejects wrong length or duplicate ids", () => {
    expect(evaluateRankingAnswer(["a", "b"], ["a"])).toBe(false);
    expect(evaluateRankingAnswer(["a", "b"], ["a", "a"])).toBe(false);
  });

  it("rejects extra or unknown ids", () => {
    expect(evaluateRankingAnswer(["a", "b", "c"], ["a", "b", "x"])).toBe(false);
    expect(evaluateRankingAnswer(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("scoreRankingByPositionMatch", () => {
  it("sums tier points for matching positions", () => {
    const correct = ["a", "b", "c"];
    const tiers = [3, 2, 1];
    expect(scoreRankingByPositionMatch(correct, ["a", "b", "c"], tiers)).toBe(6);
    expect(scoreRankingByPositionMatch(correct, ["a", "c", "b"], tiers)).toBe(3);
    expect(scoreRankingByPositionMatch(correct, ["b", "c", "a"], tiers)).toBe(0);
  });
});
