import { describe, expect, it } from "vitest";
import {
  cloneQuestionForm,
  editorQuizModeFromLoadedQuestion,
  mapLoadedRoomQuestions,
  toQuestionReplaceInput,
  validateQuestionFormEntry,
  type QuestionForm,
} from "./adminEventForm";

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

describe("cloneQuestionForm", () => {
  it("copies content without id and resets runtime flags", () => {
    const source: QuestionForm = {
      id: "q1",
      subQuizId: null,
      text: "Лада Азимут",
      imageUrl: "/media/a.png",
      useImages: true,
      type: "single",
      editorQuizMode: true,
      points: 1,
      maxAnswers: 1,
      adminDone: true,
      isActive: true,
      showVoteCount: true,
      options: [
        { text: "Да", isCorrect: true, imageUrl: "/media/o1.png" },
        { text: "Нет", isCorrect: false },
      ],
    };
    const cloned = cloneQuestionForm(source);
    expect(cloned.id).toBeUndefined();
    expect(cloned.text).toBe("Лада Азимут");
    expect(cloned.adminDone).toBe(false);
    expect(cloned.isActive).toBe(false);
    expect(cloned.imageUrl).toBe("/media/a.png");
    expect(cloned.options).toEqual(source.options);
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

function baseQuestionForm(overrides: Partial<QuestionForm> = {}): QuestionForm {
  return {
    subQuizId: null,
    text: "Question",
    type: "single",
    editorQuizMode: false,
    points: 1,
    maxAnswers: 1,
    options: [
      { text: "A", isCorrect: true },
      { text: "B", isCorrect: false },
    ],
    ...overrides,
  };
}

describe("validateQuestionFormEntry", () => {
  it("validates temperature weights", () => {
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          type: "temperature",
          options: [
            { text: "Cold", isCorrect: false, weight: 25 },
            { text: "Hot", isCorrect: false },
          ],
        }),
        0,
      ),
    ).toMatch(/вес от 0 до 100/);
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          type: "temperature",
          temperatureSubtitle: "Subtitle",
          options: [
            { text: "Cold", isCorrect: false, weight: 25 },
            { text: "Hot", isCorrect: false, weight: 75 },
          ],
        }),
        0,
      ),
    ).toBeNull();
  });

  it("validates ranking minimum options", () => {
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          type: "ranking",
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        }),
        0,
      ),
    ).toMatch(/не меньше трёх/);
  });

  it("validates tag cloud max answers", () => {
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          type: "tag_cloud",
          maxAnswers: 0,
          options: [],
        }),
        0,
      ),
    ).toMatch(/макс. ответов/);
  });
});

describe("toQuestionReplaceInput", () => {
  it("maps temperature subtitle to server payload", () => {
    const payload = toQuestionReplaceInput(
      baseQuestionForm({
        type: "temperature",
        temperatureSubtitle: "  Уровень тревоги ",
        options: [
          { text: "Low", isCorrect: false, weight: 0 },
          { text: "High", isCorrect: false, weight: 100 },
        ],
      }),
    );
    expect(payload.type).toBe("temperature");
    if (payload.type !== "temperature") throw new Error("expected temperature question");
    expect(payload.temperatureSubtitle).toBe("Уровень тревоги");
    expect(payload.scoringMode).toBe("poll");
  });
});
