import { describe, expect, it } from "vitest";
import {
  buildCloudManualFromQuestions,
  mergeCloudManualSources,
  readCloudManualFromPublicView,
} from "./tagCloudAdmin";

describe("tagCloudAdmin persistence helpers", () => {
  it("builds manual map only for questions with cloud overrides", () => {
    expect(
      buildCloudManualFromQuestions([
        { id: "q-1", injectedTagWords: [{ text: "врач", count: 10 }] },
        { id: "q-2" },
      ]),
    ).toEqual({
      "q-1": {
        hiddenTagTexts: [],
        injectedTagWords: [{ text: "врач", count: 10 }],
        tagCountOverrides: [],
      },
    });
  });

  it("prefers server manual over local cache", () => {
    expect(
      mergeCloudManualSources(
        {
          "q-1": {
            hiddenTagTexts: [],
            injectedTagWords: [{ text: "сервер", count: 2 }],
            tagCountOverrides: [],
          },
        },
        {
          "q-1": {
            hiddenTagTexts: [],
            injectedTagWords: [{ text: "локально", count: 1 }],
            tagCountOverrides: [],
          },
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

  it("reads manual map from public view payload", () => {
    expect(
      readCloudManualFromPublicView({
        tagCloudManualByQuestionId: {
          "q-1": {
            hiddenTagTexts: [],
            injectedTagWords: [{ text: "врач", count: 5 }],
            tagCountOverrides: [],
          },
        },
      }),
    ).toEqual({
      "q-1": {
        hiddenTagTexts: [],
        injectedTagWords: [{ text: "врач", count: 5 }],
        tagCountOverrides: [],
      },
    });
  });
});
