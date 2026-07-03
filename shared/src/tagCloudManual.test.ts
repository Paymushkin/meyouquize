import { describe, expect, it } from "vitest";
import {
  migrateLegacyTagCloudManualIntoMap,
  resolveTagCloudManualForQuestion,
  withProjectorTagCloudFields,
  applyQuestionResultManualDisplay,
} from "./tagCloudManual.js";

describe("resolveTagCloudManualForQuestion", () => {
  it("returns empty state for missing question id", () => {
    expect(
      resolveTagCloudManualForQuestion({
        "q-1": {
          hiddenTagTexts: ["x"],
          injectedTagWords: [],
          tagCountOverrides: [],
          optionVoteCountOverrides: [],
        },
      }),
    ).toEqual({
      hiddenTagTexts: [],
      injectedTagWords: [],
      tagCountOverrides: [],
      optionVoteCountOverrides: [],
    });
  });

  it("returns manual entry for known question id", () => {
    expect(
      resolveTagCloudManualForQuestion(
        {
          "q-1": {
            hiddenTagTexts: ["скрытый"],
            injectedTagWords: [{ text: "врач", count: 2 }],
            tagCountOverrides: [{ text: "синий", count: 5 }],
            optionVoteCountOverrides: [],
          },
        },
        "q-1",
      ),
    ).toEqual({
      hiddenTagTexts: ["скрытый"],
      injectedTagWords: [{ text: "врач", count: 2 }],
      tagCountOverrides: [{ text: "синий", count: 5 }],
      optionVoteCountOverrides: [],
    });
  });
});

describe("withProjectorTagCloudFields", () => {
  it("clears runtime tag fields outside question mode", () => {
    expect(
      withProjectorTagCloudFields({
        mode: "title",
        questionId: "q-1",
        tagCloudManualByQuestionId: {
          "q-1": {
            hiddenTagTexts: ["x"],
            injectedTagWords: [{ text: "a", count: 1 }],
            tagCountOverrides: [],
            optionVoteCountOverrides: [],
          },
        },
        hiddenTagTexts: ["stale"],
        injectedTagWords: [{ text: "stale", count: 9 }],
        tagCountOverrides: [{ text: "stale", count: 9 }],
      }),
    ).toMatchObject({
      hiddenTagTexts: [],
      injectedTagWords: [],
      tagCountOverrides: [],
    });
  });

  it("projects manual map into runtime fields for active question", () => {
    expect(
      withProjectorTagCloudFields({
        mode: "question",
        questionId: "q-1",
        tagCloudManualByQuestionId: {
          "q-1": {
            hiddenTagTexts: ["скрытый"],
            injectedTagWords: [{ text: "врач", count: 3 }],
            tagCountOverrides: [],
            optionVoteCountOverrides: [],
          },
        },
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [],
      }),
    ).toMatchObject({
      hiddenTagTexts: ["скрытый"],
      injectedTagWords: [{ text: "врач", count: 3 }],
      tagCountOverrides: [],
    });
  });
});

describe("migrateLegacyTagCloudManualIntoMap", () => {
  it("migrates legacy top-level fields when map entry is missing", () => {
    expect(
      migrateLegacyTagCloudManualIntoMap(
        {},
        {
          questionId: "q-1",
          hiddenTagTexts: ["скрытый"],
          injectedTagWords: [{ text: "врач", count: 1 }],
          tagCountOverrides: [],
        },
      ),
    ).toEqual({
      "q-1": {
        hiddenTagTexts: ["скрытый"],
        injectedTagWords: [{ text: "врач", count: 1 }],
        tagCountOverrides: [],
        optionVoteCountOverrides: [],
      },
    });
  });

  it("does not overwrite existing map entry", () => {
    expect(
      migrateLegacyTagCloudManualIntoMap(
        {
          "q-1": {
            hiddenTagTexts: [],
            injectedTagWords: [{ text: "сервер", count: 2 }],
            tagCountOverrides: [],
            optionVoteCountOverrides: [],
          },
        },
        {
          questionId: "q-1",
          injectedTagWords: [{ text: "legacy", count: 1 }],
        },
      ),
    ).toEqual({
      "q-1": {
        hiddenTagTexts: [],
        injectedTagWords: [{ text: "сервер", count: 2 }],
        tagCountOverrides: [],
        optionVoteCountOverrides: [],
      },
    });
  });
});

describe("applyQuestionResultManualDisplay", () => {
  it("applies absolute option vote count overrides for single choice (legacy)", () => {
    const row = {
      questionId: "q-1",
      type: "single",
      optionStats: [
        { optionId: "o1", text: "A", count: 2, isCorrect: true },
        { optionId: "o2", text: "B", count: 5, isCorrect: false },
      ],
      tagCloud: [],
    };
    expect(
      applyQuestionResultManualDisplay(row, {
        "q-1": {
          hiddenTagTexts: [],
          injectedTagWords: [],
          tagCountOverrides: [],
          optionVoteCountOverrides: [{ text: "o2", count: 99 }],
        },
      }),
    ).toMatchObject({
      optionStats: [
        { optionId: "o1", count: 2 },
        { optionId: "o2", count: 99 },
      ],
    });
  });

  it("adds delta overrides on top of live vote counts", () => {
    const row = {
      questionId: "q-1",
      type: "single",
      optionStats: [
        { optionId: "o1", text: "A", count: 10, isCorrect: true },
        { optionId: "o2", text: "B", count: 5, isCorrect: false },
      ],
      tagCloud: [],
    };
    expect(
      applyQuestionResultManualDisplay(row, {
        "q-1": {
          hiddenTagTexts: [],
          injectedTagWords: [],
          tagCountOverrides: [],
          optionVoteCountOverrides: [{ text: "o2", count: 3, mode: "delta" }],
        },
      }),
    ).toMatchObject({
      optionStats: [
        { optionId: "o1", count: 10 },
        { optionId: "o2", count: 8 },
      ],
    });
  });

  it("merges tag cloud manual adjustments", () => {
    const row = {
      questionId: "q-tc",
      type: "tag_cloud",
      optionStats: [],
      tagCloud: [{ text: "live", count: 1 }],
    };
    expect(
      applyQuestionResultManualDisplay(row, {
        "q-tc": {
          hiddenTagTexts: [],
          injectedTagWords: [{ text: "manual", count: 4 }],
          tagCountOverrides: [{ text: "live", count: 10 }],
          optionVoteCountOverrides: [],
        },
      }),
    ).toEqual({
      questionId: "q-tc",
      type: "tag_cloud",
      optionStats: [],
      tagCloud: [
        { text: "live", count: 10 },
        { text: "manual", count: 4 },
      ],
    });
  });
});
