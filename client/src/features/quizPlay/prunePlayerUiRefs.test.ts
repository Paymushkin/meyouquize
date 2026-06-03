import { describe, expect, it } from "vitest";
import { prunePlayerUiRefsForRoom } from "@meyouquize/shared";
import { resolveEnabledQuizReportSubQuizIds } from "./playerQuizResults";

describe("prunePlayerUiRefsForRoom", () => {
  it("removes deleted sub-quiz report tile and visible result questions", () => {
    const deletedSq = "sq-deleted";
    const keptSq = "sq-kept";
    const deletedQ = "q-deleted";
    const keptQ = "q-kept";

    const pruned = prunePlayerUiRefsForRoom(
      {
        playerQuizResultsSubQuizIds: [deletedSq, keptSq],
        playerQuizResultsSubQuizId: deletedSq,
        playerQuizResultsTileVisible: true,
        playerTilesOrder: [
          "speaker_tile",
          `quiz_results_tile:${deletedSq}`,
          `quiz_results_tile:${keptSq}`,
        ],
        playerVisibleResultQuestionIds: [deletedQ, keptQ],
        leaderboardSubQuizId: deletedSq,
        reportVoteQuestionIds: [deletedQ],
        reportQuizQuestionIds: [deletedQ],
        reportQuizSubQuizIds: [deletedSq, keptSq],
      },
      new Set([keptSq]),
      new Set([keptQ]),
    );

    expect(pruned.playerQuizResultsSubQuizIds).toEqual([keptSq]);
    expect(pruned.playerQuizResultsSubQuizId).toBe(keptSq);
    expect(pruned.playerTilesOrder).toEqual(["speaker_tile", `quiz_results_tile:${keptSq}`]);
    expect(pruned.playerVisibleResultQuestionIds).toEqual([keptQ]);
    expect(pruned.leaderboardSubQuizId).toBe(keptSq);
    expect(pruned.reportQuizSubQuizIds).toEqual([keptSq]);
  });
});

describe("resolveEnabledQuizReportSubQuizIds", () => {
  it("drops stale ids when no sub-quizzes remain", () => {
    expect(
      resolveEnabledQuizReportSubQuizIds({
        subQuizIds: ["missing"],
        subQuizzes: [],
      }),
    ).toEqual([]);
  });
});
