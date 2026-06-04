import { describe, expect, it } from "vitest";
import { editorQuizModeFromLoadedQuestion, mapLoadedRoomQuestions } from "./adminEventForm";

describe("editorQuizModeFromLoadedQuestion", () => {
  it("restores quiz editor mode for standalone vote with correct option", () => {
    expect(
      editorQuizModeFromLoadedQuestion(
        {
          type: "SINGLE",
          scoringMode: "POLL",
          options: [
            { id: "1", text: "A", isCorrect: true },
            { id: "2", text: "B", isCorrect: false },
          ],
        },
        null,
      ),
    ).toBe(true);
  });

  it("keeps poll editor mode for standalone vote without correct options", () => {
    expect(
      editorQuizModeFromLoadedQuestion(
        {
          type: "SINGLE",
          scoringMode: "POLL",
          options: [
            { id: "1", text: "A", isCorrect: false },
            { id: "2", text: "B", isCorrect: false },
          ],
        },
        null,
      ),
    ).toBe(false);
  });

  it("uses scoringMode for sub-quiz questions", () => {
    expect(
      editorQuizModeFromLoadedQuestion(
        {
          type: "SINGLE",
          scoringMode: "POLL",
          options: [{ id: "1", text: "A", isCorrect: true }],
        },
        "sq-1",
      ),
    ).toBe(false);
  });
});

describe("mapLoadedRoomQuestions", () => {
  it("preserves correct flags when reloading standalone single vote", () => {
    const [form] = mapLoadedRoomQuestions(
      [
        {
          id: "q1",
          text: "Question",
          type: "SINGLE",
          scoringMode: "POLL",
          points: 0,
          maxAnswers: 1,
          adminDone: true,
          order: 0,
          isActive: false,
          options: [
            { id: "o1", text: "Yes", isCorrect: true },
            { id: "o2", text: "No", isCorrect: false },
          ],
        },
      ],
      {},
      null,
    );

    expect(form.editorQuizMode).toBe(true);
    expect(form.options[0]?.isCorrect).toBe(true);
    expect(form.adminDone).toBe(true);
  });
});
