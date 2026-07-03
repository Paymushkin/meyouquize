import { describe, expect, it } from "vitest";
import { normalizePublicViewState } from "@meyouquize/shared";
import { initialProjectorSessionState, projectorSessionReducer } from "./projectorSessionReducer";

describe("projectorSessionReducer publicView", () => {
  it("applies option vote manual overrides without dashboard refresh", () => {
    const baseView = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      tagCloudManualByQuestionId: {},
    });
    const state = {
      ...initialProjectorSessionState,
      view: baseView,
      questions: [
        {
          questionId: "q1",
          type: "single",
          optionStats: [
            { optionId: "o1", count: 10, text: "A" },
            { optionId: "o2", count: 2, text: "B" },
          ],
        },
      ],
    };

    const next = projectorSessionReducer(state, {
      type: "publicView",
      payload: {
        title: "Demo",
        tagCloudManualByQuestionId: {
          q1: {
            hiddenTagTexts: [],
            injectedTagWords: [],
            tagCountOverrides: [],
            optionVoteCountOverrides: [{ text: "o2", count: 99 }],
          },
        },
      },
    });

    expect(next).not.toBe(state);
    expect(next.view.tagCloudManualByQuestionId.q1?.optionVoteCountOverrides).toEqual([
      { text: "o2", count: 99 },
    ]);
  });
});
