import { describe, expect, it } from "vitest";
import {
  applyCloudManualToQuestions,
  buildCloudManualFromQuestions,
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

  it("applies server manual map to question forms", () => {
    expect(
      applyCloudManualToQuestions(
        [{ id: "q-1" }, { id: "q-2", injectedTagWords: [{ text: "старый", count: 1 }] }],
        {
          "q-1": {
            hiddenTagTexts: ["скрытый"],
            injectedTagWords: [{ text: "сервер", count: 2 }],
            tagCountOverrides: [],
          },
        },
      ),
    ).toEqual([
      {
        id: "q-1",
        hiddenTagTexts: ["скрытый"],
        injectedTagWords: [{ text: "сервер", count: 2 }],
        tagCountOverrides: [],
      },
      { id: "q-2", injectedTagWords: [{ text: "старый", count: 1 }] },
    ]);
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
