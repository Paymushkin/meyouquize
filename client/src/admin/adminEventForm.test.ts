import { describe, expect, it } from "vitest";
import { buildDebatePollQuestionPatch, buildGeoPollQuestionPatch } from "@meyouquize/shared";
import {
  applyVotesDisplayBlocksReorder,
  buildVotesDisplayBlocks,
  cloneQuestionForm,
  editorQuizModeFromLoadedQuestion,
  filterVotesDisplayBlocks,
  getQuestionTypeSelectValue,
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

describe("getQuestionTypeSelectValue", () => {
  it("returns geo_poll and debate_poll for presets", () => {
    expect(
      getQuestionTypeSelectValue({
        subQuizId: null,
        text: "",
        useImages: false,
        ...buildGeoPollQuestionPatch(),
        points: 1,
        maxAnswers: 1,
        adminDone: false,
        isActive: false,
        showVoteCount: true,
      }),
    ).toBe("geo_poll");
    expect(
      getQuestionTypeSelectValue({
        subQuizId: null,
        text: "",
        useImages: false,
        ...buildDebatePollQuestionPatch(),
        points: 1,
        maxAnswers: 1,
        adminDone: false,
        isActive: false,
        showVoteCount: true,
      }),
    ).toBe("debate_poll");
    expect(
      getQuestionTypeSelectValue({
        subQuizId: null,
        text: "Тезис",
        useImages: false,
        type: "single",
        editorQuizMode: false,
        projectorDebateLayout: true,
        points: 1,
        maxAnswers: 1,
        adminDone: false,
        isActive: false,
        showVoteCount: true,
        options: [
          { text: "Своя позиция A", isCorrect: false },
          { text: "Своя позиция B", isCorrect: false },
          { text: "Свой третий", isCorrect: false },
        ],
      }),
    ).toBe("debate_poll");
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

  it("rejects temperature inside quizzes", () => {
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          subQuizId: "sq-1",
          type: "temperature",
          options: [
            { text: "Cold", isCorrect: false, weight: 25 },
            { text: "Hot", isCorrect: false, weight: 75 },
          ],
        }),
        0,
      ),
    ).toMatch(/недоступно в квизах/);
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

  it("allows geo poll without manual options", () => {
    expect(
      validateQuestionFormEntry(
        baseQuestionForm({
          subQuizId: null,
          text: "Откуда вы?",
          type: "single",
          editorQuizMode: false,
          ...buildGeoPollQuestionPatch("Откуда вы?"),
        }),
        0,
      ),
    ).toBeNull();
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

  it("maps geo poll to empty options and dictionary", () => {
    const payload = toQuestionReplaceInput(
      baseQuestionForm({
        text: "Откуда вы?",
        ...buildGeoPollQuestionPatch("Откуда вы?"),
        options: [{ text: "should-be-cleared", isCorrect: false }],
      }),
    );
    expect(payload.type).toBe("single");
    expect(payload.options).toEqual([]);
    expect(payload.geoPollDictionary).toBe("world_cities");
    expect(payload.projectorDebateLayout).toBe(false);
    expect(payload.debateBaselineQuestionId).toBeNull();
  });

  it("persists debate option colors on save", () => {
    const payload = toQuestionReplaceInput(
      baseQuestionForm({
        text: "Тезис",
        ...buildDebatePollQuestionPatch("Тезис"),
        options: [
          { text: "A", isCorrect: false },
          { text: "B", isCorrect: false, color: "#112233" },
          { text: "C", isCorrect: false },
        ],
      }),
    );
    expect(payload.options.map((o) => o.color)).toEqual(["#1976d2", "#112233", "#90a4ae"]);
  });
});

describe("votes display blocks order", () => {
  it("keeps debate series interleaved with singles by form order", () => {
    const forms: QuestionForm[] = [
      baseQuestionForm({ subQuizId: null, text: "Vote A", id: "a" }),
      baseQuestionForm({
        subQuizId: null,
        text: "Debate R1",
        id: "d1",
        ...buildDebatePollQuestionPatch("Debate"),
        debateSeriesId: "ser1",
        debateRoundIndex: 0,
      }),
      baseQuestionForm({
        subQuizId: null,
        text: "Debate R2",
        id: "d2",
        ...buildDebatePollQuestionPatch("Debate"),
        debateSeriesId: "ser1",
        debateRoundIndex: 1,
      }),
      baseQuestionForm({ subQuizId: null, text: "Vote B", id: "b" }),
    ];
    const blocks = buildVotesDisplayBlocks(forms);
    expect(blocks.map((block) => block.kind)).toEqual(["single", "debate_series", "single"]);
    expect(blocks[1]).toMatchObject({ kind: "debate_series", seriesId: "ser1" });
    if (blocks[1]?.kind === "debate_series") {
      expect(blocks[1].formIndices).toEqual([1, 2]);
    }
  });

  it("moves a debate series block among singles", () => {
    const forms: QuestionForm[] = [
      baseQuestionForm({ subQuizId: null, text: "Vote A", id: "a" }),
      baseQuestionForm({
        subQuizId: null,
        text: "Debate R1",
        id: "d1",
        ...buildDebatePollQuestionPatch("Debate"),
        debateSeriesId: "ser1",
        debateRoundIndex: 0,
      }),
      baseQuestionForm({
        subQuizId: null,
        text: "Debate R2",
        id: "d2",
        ...buildDebatePollQuestionPatch("Debate"),
        debateSeriesId: "ser1",
        debateRoundIndex: 1,
      }),
      baseQuestionForm({ subQuizId: null, text: "Vote B", id: "b" }),
    ];
    const blocks = buildVotesDisplayBlocks(forms);
    const next = applyVotesDisplayBlocksReorder(forms, blocks, 1, 0);
    expect(next).not.toBeNull();
    expect(next!.map((q) => q.id)).toEqual(["d1", "d2", "a", "b"]);
    expect(buildVotesDisplayBlocks(next!).map((block) => block.kind)).toEqual([
      "debate_series",
      "single",
      "single",
    ]);
  });

  it("reorders only within a filtered active scope", () => {
    const forms: QuestionForm[] = [
      baseQuestionForm({ subQuizId: null, text: "Vote A", id: "a" }),
      baseQuestionForm({
        subQuizId: null,
        text: "Debate",
        id: "d1",
        ...buildDebatePollQuestionPatch("Debate"),
        debateSeriesId: "ser1",
        debateRoundIndex: 0,
      }),
      baseQuestionForm({ subQuizId: null, text: "Vote B", id: "b" }),
    ];
    const blocks = filterVotesDisplayBlocks(buildVotesDisplayBlocks(forms), new Set([0, 1, 2]));
    const next = applyVotesDisplayBlocksReorder(forms, blocks, 2, 0);
    expect(next!.map((q) => q.id)).toEqual(["b", "a", "d1"]);
  });
});
