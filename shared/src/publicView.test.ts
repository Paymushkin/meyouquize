import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  mergePublicViewState,
  normalizePublicViewState,
  parseQuizResultsSubQuizIdFromTileId,
  quizResultsTileIdForSubQuiz,
  resolveProjectorLeaderboardRows,
  ruBallLabel,
  sanitizeExternalHttpUrl,
  withQuizResultsTileLast,
} from "./index.js";
import { sanitizeBrandThemeId } from "./brandThemes.js";

describe("quiz results tile ids", () => {
  it("builds and parses sub-quiz tile id", () => {
    expect(quizResultsTileIdForSubQuiz("sq-1")).toBe("quiz_results_tile:sq-1");
    expect(parseQuizResultsSubQuizIdFromTileId("quiz_results_tile:sq-1")).toBe("sq-1");
    expect(parseQuizResultsSubQuizIdFromTileId("quiz_results_tile")).toBeNull();
  });

  it("moves quiz result tiles to the end", () => {
    expect(
      withQuizResultsTileLast([
        "quiz_results_tile:sq-1",
        "speaker_tile",
        "quiz_results_tile:sq-2",
        "program_tile",
      ]),
    ).toEqual(["speaker_tile", "program_tile", "quiz_results_tile:sq-1", "quiz_results_tile:sq-2"]);
  });
});

describe("ruBallLabel", () => {
  it("declines Russian ball labels", () => {
    expect(ruBallLabel(1)).toBe("1 балл");
    expect(ruBallLabel(2)).toBe("2 балла");
    expect(ruBallLabel(5)).toBe("5 баллов");
    expect(ruBallLabel(11)).toBe("11 баллов");
  });
});

describe("sanitizeExternalHttpUrl", () => {
  it("accepts http(s) urls", () => {
    expect(sanitizeExternalHttpUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("rejects non-http schemes", () => {
    expect(sanitizeExternalHttpUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeExternalHttpUrl("ftp://files.example.com")).toBe("");
  });
});

describe("sanitizeBrandThemeId", () => {
  it("falls back to default for unknown theme", () => {
    expect(sanitizeBrandThemeId("unknown")).toBe("default");
    expect(sanitizeBrandThemeId("meyou")).toBe("meyou");
  });
});

describe("normalizePublicViewState", () => {
  it("clears questionId when mode is not question", () => {
    const state = normalizePublicViewState({
      mode: "title",
      questionId: "q-1",
    });
    expect(state.mode).toBe("title");
    expect(state.questionId).toBeUndefined();
  });

  it("keeps questionId in question mode", () => {
    const state = normalizePublicViewState({
      mode: "question",
      questionId: "q-1",
    });
    expect(state.questionId).toBe("q-1");
  });

  it("keeps tag cloud manual map by question id", () => {
    const state = normalizePublicViewState({
      tagCloudManualByQuestionId: {
        "q-1": {
          hiddenTagTexts: ["скрытый"],
          injectedTagWords: [{ text: "врач", count: 10 }],
          tagCountOverrides: [{ text: "синий", count: 3 }],
        },
        "": {
          hiddenTagTexts: ["ignored"],
          injectedTagWords: [],
          tagCountOverrides: [],
        },
      },
    });
    expect(state.tagCloudManualByQuestionId["q-1"]).toEqual({
      hiddenTagTexts: ["скрытый"],
      injectedTagWords: [{ text: "врач", count: 10 }],
      tagCountOverrides: [{ text: "синий", count: 3 }],
      optionVoteCountOverrides: [],
    });
    expect(state.tagCloudManualByQuestionId[""]).toBeUndefined();
  });

  it("migrates legacy top-level tag fields into manual map", () => {
    const state = normalizePublicViewState({
      mode: "question",
      questionId: "q-1",
      injectedTagWords: [{ text: "legacy", count: 4 }],
    });
    expect(state.tagCloudManualByQuestionId["q-1"]).toEqual({
      hiddenTagTexts: [],
      injectedTagWords: [{ text: "legacy", count: 4 }],
      tagCountOverrides: [],
      optionVoteCountOverrides: [],
    });
  });

  it("prunes banner click stats for removed banners", () => {
    const state = normalizePublicViewState({
      playerBanners: [
        {
          id: "b1",
          linkUrl: "https://example.com",
          backgroundUrl: "https://example.com/bg.png",
          size: "1x1",
          isVisible: true,
        },
      ],
      playerBannerClickStats: [
        { bannerId: "b1", uniqueClicks: 2 },
        { bannerId: "gone", uniqueClicks: 5 },
      ],
      playerBannerClickParticipantIds: {
        b1: ["p1", "p2"],
        gone: ["p9"],
      },
    });
    expect(state.playerBannerClickStats).toEqual([{ bannerId: "b1", uniqueClicks: 2 }]);
    expect(state.playerBannerClickParticipantIds).toEqual({ b1: ["p1", "p2"] });
  });
});

describe("mergePublicViewState", () => {
  it("resets reveal stage when switching questions", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q-1",
      questionRevealStage: "results",
    });
    const next = mergePublicViewState(prev, { questionId: "q-2" });
    expect(next.questionId).toBe("q-2");
    expect(next.questionRevealStage).toBe("options");
  });

  it("clears question state when leaving question mode", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q-1",
      questionRevealStage: "results",
    });
    const next = mergePublicViewState(prev, { mode: "title" });
    expect(next.mode).toBe("title");
    expect(next.questionId).toBeUndefined();
    expect(next.questionRevealStage).toBe("options");
  });

  it("projects manual tag cloud fields for active question", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q-1",
      tagCloudManualByQuestionId: {
        "q-1": {
          hiddenTagTexts: ["скрытый"],
          injectedTagWords: [{ text: "врач", count: 2 }],
          tagCountOverrides: [],
        },
      },
    });
    const next = mergePublicViewState(prev, { showVoteCount: true });
    expect(next.injectedTagWords).toEqual([{ text: "врач", count: 2 }]);
    expect(next.hiddenTagTexts).toEqual(["скрытый"]);
  });
});

describe("resolveProjectorLeaderboardRows", () => {
  it("returns rows for preferred sub-quiz", () => {
    const rows = resolveProjectorLeaderboardRows(
      [
        {
          subQuizId: "sq-1",
          rows: [{ participantId: "p1", nickname: "A", score: 1, totalResponseMs: 0 }],
        },
        {
          subQuizId: "sq-2",
          rows: [{ participantId: "p2", nickname: "B", score: 2, totalResponseMs: 0 }],
        },
      ],
      "sq-2",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nickname).toBe("B");
  });

  it("falls back to first board or legacy list", () => {
    expect(
      resolveProjectorLeaderboardRows(
        [
          {
            subQuizId: "sq-1",
            rows: [{ participantId: "p1", nickname: "A", score: 1, totalResponseMs: 0 }],
          },
        ],
        "",
      )[0]?.nickname,
    ).toBe("A");
    expect(
      resolveProjectorLeaderboardRows([], undefined, [
        { participantId: "p9", nickname: "Legacy", score: 0, totalResponseMs: 0 },
      ])[0]?.nickname,
    ).toBe("Legacy");
  });
});

describe("DEFAULT_PUBLIC_VIEW_STATE", () => {
  it("has stable defaults", () => {
    expect(DEFAULT_PUBLIC_VIEW_STATE.mode).toBe("title");
    expect(DEFAULT_PUBLIC_VIEW_STATE.projectorJoinQrVisible).toBe(false);
  });
});
