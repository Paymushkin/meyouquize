import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPERATURE_OPTION_WEIGHTS } from "@meyouquize/shared";
import type { QuestionForm } from "../../admin/adminEventForm";
import {
  cloneQuestionForms,
  patchOptionAtIndex,
  patchQuestionAtIndex,
  patchQuestionForm,
  type RankingHintDefaults,
} from "./adminQuestionFormPatch";

const rankingHints: RankingHintDefaults = {
  quiz: "quiz hint",
  jury: "jury hint",
};

function baseQuestion(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    subQuizId: null,
    text: "Question",
    type: "single",
    editorQuizMode: false,
    points: 1,
    maxAnswers: 1,
    options: [
      { text: "A", isCorrect: false },
      { text: "B", isCorrect: false },
    ],
    ...overrides,
  };
}

describe("patchQuestionForm", () => {
  it("switches to ranking with jury defaults and pads options to three", () => {
    const result = patchQuestionForm(baseQuestion(), { type: "ranking" }, rankingHints);
    expect(result.type).toBe("ranking");
    expect(result.editorQuizMode).toBe(true);
    expect(result.rankingKind).toBe("jury");
    expect(result.rankingPlayerHint).toBe("jury hint");
    expect(result.rankingProjectorMetric).toBe("avg_score");
    expect(result.options).toHaveLength(3);
    expect(result.rankingPointsByRank).toEqual([3, 2, 1]);
  });

  it("uses quiz ranking points when rankingKind is quiz", () => {
    const result = patchQuestionForm(
      baseQuestion({
        options: [
          { text: "A", isCorrect: false },
          { text: "B", isCorrect: false },
          { text: "C", isCorrect: false },
        ],
      }),
      { type: "ranking", rankingKind: "quiz" },
      rankingHints,
    );
    expect(result.rankingPlayerHint).toBe("quiz hint");
    expect(result.rankingPointsByRank).toEqual([1, 2, 3]);
  });

  it("switches to tag_cloud in quiz mode with default options", () => {
    const result = patchQuestionForm(
      baseQuestion({ subQuizId: "sq-1", editorQuizMode: true }),
      { type: "tag_cloud", maxAnswers: 3, options: [] },
      rankingHints,
    );
    expect(result.type).toBe("tag_cloud");
    expect(result.editorQuizMode).toBe(true);
    expect(result.options).toHaveLength(2);
    expect(result.rankingPointsByRank).toEqual([1, 1]);
  });

  it("switches to temperature with default weights when options are empty", () => {
    const result = patchQuestionForm(
      baseQuestion({ options: [] }),
      { type: "temperature" },
      rankingHints,
    );
    expect(result.type).toBe("temperature");
    expect(result.editorQuizMode).toBe(false);
    expect(result.options).toHaveLength(DEFAULT_TEMPERATURE_OPTION_WEIGHTS.length);
    expect(result.options.map((o) => o.weight)).toEqual([...DEFAULT_TEMPERATURE_OPTION_WEIGHTS]);
    expect(result.options.every((o) => !o.isCorrect)).toBe(true);
  });

  it("keeps only one correct option in quiz-mode single", () => {
    const result = patchQuestionForm(
      baseQuestion({
        editorQuizMode: true,
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: true },
        ],
      }),
      { type: "single" },
      rankingHints,
    );
    expect(result.options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(result.options[0]?.isCorrect).toBe(true);
    expect(result.options[1]?.isCorrect).toBe(false);
  });

  it("when leaving tag_cloud for single keeps quiz mode and first correct", () => {
    const result = patchQuestionForm(
      baseQuestion({
        type: "tag_cloud",
        editorQuizMode: true,
        maxAnswers: 2,
        options: [
          { text: "tag", isCorrect: true },
          { text: "tag2", isCorrect: true },
        ],
      }),
      { type: "single" },
      rankingHints,
    );
    expect(result.type).toBe("single");
    expect(result.editorQuizMode).toBe(true);
    expect(result.options[0]?.isCorrect).toBe(true);
  });
});

describe("patchQuestionAtIndex", () => {
  it("patches only the target question", () => {
    const forms = [baseQuestion({ text: "Q1" }), baseQuestion({ text: "Q2" })];
    const next = patchQuestionAtIndex(forms, 1, { text: "Updated" }, rankingHints);
    expect(next[0]?.text).toBe("Q1");
    expect(next[1]?.text).toBe("Updated");
    expect(forms[1]?.text).toBe("Q2");
  });
});

describe("patchOptionAtIndex", () => {
  it("marks only one option correct for single vote", () => {
    const forms = [
      baseQuestion({
        type: "single",
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: false },
        ],
      }),
    ];
    const next = patchOptionAtIndex(forms, 0, 1, { isCorrect: true });
    expect(next[0]?.options[0]?.isCorrect).toBe(false);
    expect(next[0]?.options[1]?.isCorrect).toBe(true);
  });

  it("marks non-empty tag_cloud options correct in quiz mode", () => {
    const forms = [
      baseQuestion({
        type: "tag_cloud",
        subQuizId: "sq-1",
        editorQuizMode: true,
        maxAnswers: 2,
        options: [
          { text: "alpha", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      }),
    ];
    const next = patchOptionAtIndex(forms, 0, 0, { text: "beta" });
    expect(next[0]?.options[0]?.isCorrect).toBe(true);
    expect(next[0]?.options[1]?.isCorrect).toBe(false);
  });
});

describe("cloneQuestionForms", () => {
  it("returns a deep copy independent from source", () => {
    const forms = [baseQuestion({ text: "Original", id: "q-1" })];
    const cloned = cloneQuestionForms(forms);
    cloned[0]!.text = "Changed";
    expect(forms[0]?.text).toBe("Original");
    expect(cloned[0]?.id).toBe("q-1");
  });
});
