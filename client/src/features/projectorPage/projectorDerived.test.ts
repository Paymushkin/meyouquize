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

  it("shows title screen when speaker_questions mode has nothing on screen", () => {
    const derived = computeProjectorDerived(
      {
        ...initialProjectorSessionState,
        view: {
          ...DEFAULT_PUBLIC_VIEW_STATE,
          mode: "speaker_questions",
        },
      },
      { speakerOnScreenCount: 0 },
    );
    expect(derived.showEventTitleScreen).toBe(true);
  });

  it("keeps speaker screen when questions are on screen", () => {
    const derived = computeProjectorDerived(
      {
        ...initialProjectorSessionState,
        view: {
          ...DEFAULT_PUBLIC_VIEW_STATE,
          mode: "speaker_questions",
        },
      },
      { speakerOnScreenCount: 1 },
    );
    expect(derived.showEventTitleScreen).toBe(false);
  });

  it("resolves debate compare baseline and final questions", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "baseline",
          text: "До",
          debateBaselineQuestionId: undefined,
          optionStats: [
            { optionId: "a1", text: "A", count: 60, isCorrect: false },
            { optionId: "b1", text: "B", count: 40, isCorrect: false },
          ],
        },
        {
          questionId: "final",
          text: "После",
          debateBaselineQuestionId: "baseline",
          optionStats: [
            { optionId: "a2", text: "A", count: 35, isCorrect: false },
            { optionId: "b2", text: "B", count: 65, isCorrect: false },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "debate_compare",
        debateCompareQuestionId: "final",
      },
    });
    expect(derived.debateCompareFinalQuestion?.questionId).toBe("final");
    expect(derived.debateCompareBaselineQuestion?.questionId).toBe("baseline");
    expect(derived.barQuestionCentered).toBe(true);
  });

  it("sums debate series rounds for cumulative projector view", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "r0",
          text: "Раунд 1",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 0,
          optionStats: [
            { optionId: "a0", text: "A", count: 10, isCorrect: false, color: "#111111" },
            { optionId: "b0", text: "B", count: 5, isCorrect: false, color: "#222222" },
          ],
        },
        {
          questionId: "r1",
          text: "Раунд 2",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 1,
          optionStats: [
            { optionId: "a1", text: "A", count: 20, isCorrect: false, color: "#111111" },
            { optionId: "b1", text: "B", count: 15, isCorrect: false, color: "#222222" },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "debate_series",
        debateSeriesId: "ser1",
        debateSeriesView: "cumulative",
        questionId: "r1",
        questionRevealStage: "results",
      },
    });
    expect(derived.selectedQuestion?.text).toBe("Накопительный итог");
    expect(derived.selectedQuestion?.optionStats.map((r) => r.count)).toEqual([30, 20]);
    expect(derived.barQuestionCentered).toBe(true);
    expect(derived.showEventTitleScreen).toBe(false);
    expect(derived.debateSeriesRounds).toEqual([]);
  });

  it("exposes ordered round bars when debateSeriesShowRounds is on", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "r1",
          text: "Раунд 2",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 1,
          optionStats: [
            { optionId: "a1", text: "A", count: 20, isCorrect: false, color: "#111111" },
            { optionId: "b1", text: "B", count: 15, isCorrect: false, color: "#222222" },
          ],
        },
        {
          questionId: "r0",
          text: "Раунд 1",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 0,
          optionStats: [
            { optionId: "a0", text: "A", count: 10, isCorrect: false, color: "#111111" },
            { optionId: "b0", text: "B", count: 5, isCorrect: false, color: "#222222" },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "debate_series",
        debateSeriesId: "ser1",
        debateSeriesView: "cumulative",
        debateSeriesShowRounds: true,
        questionId: "r1",
        questionRevealStage: "results",
      },
    });
    expect(derived.debateSeriesRounds.map((r) => r.questionId)).toEqual(["r0", "r1"]);
    expect(derived.debateSeriesRounds.map((r) => r.debateRoundIndex)).toEqual([0, 1]);
  });

  it("includes per-round admin vote overrides in cumulative series totals", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "r0",
          text: "Раунд 1",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 0,
          optionStats: [
            { optionId: "a0", text: "A", count: 10, isCorrect: false, color: "#111111" },
            { optionId: "b0", text: "B", count: 5, isCorrect: false, color: "#222222" },
          ],
        },
        {
          questionId: "r1",
          text: "Раунд 2",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 1,
          optionStats: [
            { optionId: "a1", text: "A", count: 20, isCorrect: false, color: "#111111" },
            { optionId: "b1", text: "B", count: 15, isCorrect: false, color: "#222222" },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "debate_series",
        debateSeriesId: "ser1",
        debateSeriesView: "cumulative",
        debateSeriesShowRounds: true,
        questionId: "r1",
        questionRevealStage: "results",
        tagCloudManualByQuestionId: {
          r0: {
            hiddenTagTexts: [],
            injectedTagWords: [],
            tagCountOverrides: [],
            optionVoteCountOverrides: [{ text: "a0", count: 3, mode: "delta" }],
          },
        },
      },
    });
    expect(derived.selectedQuestion?.optionStats.map((r) => r.count)).toEqual([33, 20]);
    expect(derived.debateSeriesRounds[0]?.optionStats.map((r) => r.count)).toEqual([13, 5]);
    expect(derived.debateSeriesRounds[1]?.optionStats.map((r) => r.count)).toEqual([20, 15]);
  });

  it("sums only selected past rounds when debateSeriesQuestionIds is set", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "r0",
          text: "Раунд 1",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 0,
          optionStats: [
            { optionId: "a0", text: "A", count: 10, isCorrect: false },
            { optionId: "b0", text: "B", count: 5, isCorrect: false },
          ],
        },
        {
          questionId: "r1",
          text: "Раунд 2",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 1,
          optionStats: [
            { optionId: "a1", text: "A", count: 20, isCorrect: false },
            { optionId: "b1", text: "B", count: 15, isCorrect: false },
          ],
        },
        {
          questionId: "r2",
          text: "Раунд 3",
          type: "single",
          projectorDebateLayout: true,
          debateSeriesId: "ser1",
          debateRoundIndex: 2,
          optionStats: [
            { optionId: "a2", text: "A", count: 100, isCorrect: false },
            { optionId: "b2", text: "B", count: 100, isCorrect: false },
          ],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "debate_series",
        debateSeriesId: "ser1",
        debateSeriesView: "cumulative",
        debateSeriesQuestionIds: ["r0", "r1"],
        questionId: "r1",
        questionRevealStage: "results",
      },
    });
    expect(derived.selectedQuestion?.text).toBe("Накопительный итог");
    expect(derived.selectedQuestion?.optionStats.map((r) => r.count)).toEqual([30, 20]);
  });

  it("treats geo poll with empty stats as map question, not tag cloud", () => {
    const derived = computeProjectorDerived({
      ...initialProjectorSessionState,
      questions: [
        {
          questionId: "geo-1",
          text: "Откуда вы?",
          type: "single",
          geoPollDictionary: "world_cities",
          optionStats: [],
        },
      ],
      view: {
        ...DEFAULT_PUBLIC_VIEW_STATE,
        mode: "question",
        questionId: "geo-1",
      },
    });
    expect(derived.isGeoPollQuestion).toBe(true);
    expect(derived.isTagCloudQuestion).toBe(false);
    expect(derived.fullScreenCloud).toBe(false);
    expect(derived.barQuestionCentered).toBe(true);
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
