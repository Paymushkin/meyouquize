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
        optionVoteCountOverrides: [],
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
            optionVoteCountOverrides: [],
          },
        },
      ),
    ).toEqual([
      {
        id: "q-1",
        hiddenTagTexts: ["скрытый"],
        injectedTagWords: [{ text: "сервер", count: 2 }],
        tagCountOverrides: [],
        optionVoteCountOverrides: [],
      },
      {
        id: "q-2",
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [],
        optionVoteCountOverrides: [],
      },
    ]);
  });

  it("builds manual map for option vote count overrides", () => {
    expect(
      buildCloudManualFromQuestions([
        { id: "q-1", optionVoteCountOverrides: [{ text: "opt-1", count: 42 }] },
      ]),
    ).toEqual({
      "q-1": {
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [],
        optionVoteCountOverrides: [{ text: "opt-1", count: 42 }],
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
        optionVoteCountOverrides: [],
      },
    });
  });
});
