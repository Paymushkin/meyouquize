import { describe, expect, it } from "vitest";
import { buildGeoPollQuestionPatch } from "@meyouquize/shared";
import type { QuestionForm } from "../../../admin/adminEventForm";
import { questionSupportsVoteAdjust } from "./questionSupportsVoteAdjust";

function baseQuestion(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    subQuizId: null,
    text: "Вопрос",
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

describe("questionSupportsVoteAdjust", () => {
  it("allows ordinary single/multi polls", () => {
    expect(questionSupportsVoteAdjust(baseQuestion({ type: "single" }))).toBe(true);
    expect(questionSupportsVoteAdjust(baseQuestion({ type: "multi" }))).toBe(true);
  });

  it("rejects tag cloud and ranking", () => {
    expect(questionSupportsVoteAdjust(baseQuestion({ type: "tag_cloud", options: [] }))).toBe(
      false,
    );
    expect(
      questionSupportsVoteAdjust(
        baseQuestion({
          type: "ranking",
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
            { text: "C", isCorrect: false },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects geo poll (no manual vote overrides)", () => {
    expect(
      questionSupportsVoteAdjust(
        baseQuestion({
          ...buildGeoPollQuestionPatch("Откуда вы?"),
          options: [],
        }),
      ),
    ).toBe(false);
  });
});
