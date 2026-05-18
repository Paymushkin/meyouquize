import { describe, expect, it } from "vitest";
import { QuestionType } from "@prisma/client";
import {
  buildTagCloudReferenceTags,
  evaluateAnswer,
  evaluateRankingAnswer,
  evaluateTagCloudSubmission,
  scoreRankingByPositionMatch,
  scoreTagCloudQuizAnswer,
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

describe("buildTagCloudReferenceTags", () => {
  it("expands synonym groups and per-option tiers", () => {
    const refs = buildTagCloudReferenceTags(
      [
        { text: "Красный", isCorrect: true },
        { text: "Синий; Голубой", isCorrect: true },
        { text: "Белый", isCorrect: false },
      ],
      [2, 3, 0],
    );
    expect(refs).toEqual([
      { comparables: ["красный"], points: 2 },
      { comparables: ["синий", "голубой"], points: 3 },
    ]);
  });
});

describe("evaluateTagCloudSubmission", () => {
  it("delegates quiz mode to partial/full scoring", () => {
    const refs = buildTagCloudReferenceTags(
      [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: true },
        { text: "c", isCorrect: true },
      ],
      [1, 1, 1],
    );
    expect(
      evaluateTagCloudSubmission({
        referenceTags: refs,
        userTagsComparable: ["a", "b", "c"],
        maxAnswers: 3,
        fullCreditPoints: 10,
        scoringMode: "quiz",
      }),
    ).toEqual({ isCorrect: true, scoreAwarded: 10 });
  });

  it("uses any-match for poll mode", () => {
    const refs = buildTagCloudReferenceTags([{ text: "синий; голубой", isCorrect: true }], [1]);
    expect(
      evaluateTagCloudSubmission({
        referenceTags: refs,
        userTagsComparable: ["голубой", "ошибка"],
        maxAnswers: 2,
        fullCreditPoints: 5,
        scoringMode: "poll",
      }).isCorrect,
    ).toBe(true);
  });
});

describe("scoreTagCloudQuizAnswer", () => {
  const refs = [
    { comparables: ["a"], points: 2 },
    { comparables: ["b"], points: 2 },
    { comparables: ["c"], points: 3 },
  ];

  it("awards full credit when all maxAnswers tags are correct", () => {
    expect(scoreTagCloudQuizAnswer(refs, ["a", "b", "c"], 3, 10)).toEqual({
      scoreAwarded: 10,
      isCorrect: true,
    });
  });

  it("sums per-tag points for partial answers", () => {
    expect(scoreTagCloudQuizAnswer(refs, ["a", "b"], 3, 10)).toEqual({
      scoreAwarded: 4,
      isCorrect: false,
    });
    expect(scoreTagCloudQuizAnswer(refs, ["a", "x"], 3, 10)).toEqual({
      scoreAwarded: 2,
      isCorrect: false,
    });
  });

  it("does not grant full credit when a wrong tag is included", () => {
    expect(scoreTagCloudQuizAnswer(refs, ["a", "b", "c", "x"], 3, 10)).toEqual({
      scoreAwarded: 7,
      isCorrect: false,
    });
  });

  it("treats semicolon-separated synonyms as one reference tag", () => {
    const rgb = [
      { comparables: ["красный"], points: 3 },
      { comparables: ["зеленый", "зелёный"], points: 3 },
      { comparables: ["синий", "голубой"], points: 3 },
    ];
    expect(scoreTagCloudQuizAnswer(rgb, ["красный", "зеленый", "голубой"], 3, 10)).toEqual({
      scoreAwarded: 10,
      isCorrect: true,
    });
    expect(scoreTagCloudQuizAnswer(rgb, ["красный", "синий", "голубой"], 3, 10)).toEqual({
      scoreAwarded: 6,
      isCorrect: false,
    });
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
