import { describe, expect, it } from "vitest";
import {
  migrateLegacyTagCloudManualIntoMap,
  resolveTagCloudManualForQuestion,
  withProjectorTagCloudFields,
} from "./tagCloudManual.js";

describe("resolveTagCloudManualForQuestion", () => {
  it("returns empty state for missing question id", () => {
    expect(
      resolveTagCloudManualForQuestion({
        "q-1": { hiddenTagTexts: ["x"], injectedTagWords: [], tagCountOverrides: [] },
      }),
    ).toEqual({
      hiddenTagTexts: [],
      injectedTagWords: [],
      tagCountOverrides: [],
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
          },
        },
        "q-1",
      ),
    ).toEqual({
      hiddenTagTexts: ["скрытый"],
      injectedTagWords: [{ text: "врач", count: 2 }],
      tagCountOverrides: [{ text: "синий", count: 5 }],
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
      },
    });
  });
});
