import { describe, expect, it } from "vitest";
import {
  playerUiRefsChanged,
  prunePlayerUiRefsForRoom,
  prunePublicViewForRoomContent,
  publicViewRoomPruneChanged,
} from "./prunePlayerUiRefs.js";

const emptyRefs = {
  playerQuizResultsSubQuizIds: [] as string[],
  playerQuizResultsSubQuizId: "",
  playerQuizResultsTileVisible: false,
  playerTilesOrder: [] as string[],
  playerVisibleResultQuestionIds: [] as string[],
  leaderboardSubQuizId: "",
  reportVoteQuestionIds: [] as string[],
  reportQuizQuestionIds: [] as string[],
  reportQuizSubQuizIds: [] as string[],
};

describe("prunePlayerUiRefsForRoom", () => {
  it("removes stale sub-quiz and question refs", () => {
    const pruned = prunePlayerUiRefsForRoom(
      {
        ...emptyRefs,
        playerQuizResultsSubQuizIds: ["gone", "kept"],
        playerQuizResultsSubQuizId: "gone",
        playerQuizResultsTileVisible: true,
        playerTilesOrder: ["quiz_results_tile:gone", "quiz_results_tile:kept"],
        playerVisibleResultQuestionIds: ["q-gone", "q-kept"],
        leaderboardSubQuizId: "gone",
        reportQuizSubQuizIds: ["gone", "kept"],
      },
      new Set(["kept"]),
      new Set(["q-kept"]),
    );
    expect(pruned.playerQuizResultsSubQuizIds).toEqual(["kept"]);
    expect(pruned.leaderboardSubQuizId).toBe("kept");
    expect(pruned.playerVisibleResultQuestionIds).toEqual(["q-kept"]);
  });
});

describe("prunePublicViewForRoomContent", () => {
  it("resets projector when active question was deleted", () => {
    const pruned = prunePublicViewForRoomContent(
      {
        ...emptyRefs,
        mode: "question",
        questionId: "q-gone",
        questionRevealStage: "results",
      },
      new Set<string>(),
      new Set(["q-kept"]),
    );
    expect(pruned.mode).toBe("title");
    expect(pruned.questionId).toBeUndefined();
  });
});

describe("change detectors", () => {
  it("detects json diffs", () => {
    expect(playerUiRefsChanged(emptyRefs, { ...emptyRefs })).toBe(false);
    expect(playerUiRefsChanged(emptyRefs, { ...emptyRefs, leaderboardSubQuizId: "sq1" })).toBe(
      true,
    );
    expect(publicViewRoomPruneChanged(emptyRefs, emptyRefs)).toBe(false);
  });
});
