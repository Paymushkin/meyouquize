import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { computeProjectorDerived } from "./projectorDerived";
import { initialProjectorSessionState } from "./projectorSessionReducer";

describe("computeProjectorDerived", () => {
  it("selects question by public view id", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "q-1",
          text: "One",
          optionStats: [{ optionId: "o1", text: "A", count: 1, isCorrect: true }],
        },
        {
          questionId: "q-2",
          text: "Two",
          optionStats: [{ optionId: "o2", text: "B", count: 2, isCorrect: false }],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "q-2",
      },
    });
    expect(derived.selectedQuestion?.questionId).toBe("q-2");
    expect(derived.barQuestionCentered).toBe(true);
  });

  it("shows winners hero for standalone vote with nicknames", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "q-1",
          text: "Vote",
          subQuizId: null,
          optionStats: [{ optionId: "o1", text: "A", count: 1, isCorrect: true }],
          firstCorrectNicknames: ["Ann", "Bob"],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "q-1",
        showFirstCorrectAnswerer: true,
        firstCorrectWinnersCount: 2,
      },
    });
    expect(derived.firstCorrectWinnersShown).toEqual(["Ann", "Bob"]);
    expect(derived.showProjectorWinnersHero).toBe(true);
  });

  it("shows title screen when question missing", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "missing",
      },
    });
    expect(derived.showEventTitleScreen).toBe(true);
    expect(derived.selectedQuestion).toBeUndefined();
  });

  it("applies option vote count overrides from tagCloudManualByQuestionId", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "q-1",
          text: "Vote",
          type: "single",
          optionStats: [
            { optionId: "o1", text: "A", count: 2, isCorrect: true },
            { optionId: "o2", text: "B", count: 5, isCorrect: false },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "q-1",
        tagCloudManualByQuestionId: {
          "q-1": {
            hiddenTagTexts: [],
            injectedTagWords: [],
            tagCountOverrides: [],
            optionVoteCountOverrides: [{ text: "o2", count: 99 }],
          },
        },
      },
    });
    expect(derived.selectedQuestion?.optionStats.find((row) => row.optionId === "o2")?.count).toBe(
      99,
    );
    expect(derived.selectedQuestion?.optionStats.find((row) => row.optionId === "o1")?.count).toBe(
      2,
    );
  });
});
