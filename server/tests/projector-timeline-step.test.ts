import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOIN_QR_TIMELINE_STEP,
  normalizeProjectorTimelineState,
  projectorTimelineStepToPublicViewPatch,
} from "@meyouquize/shared";

describe("projector timeline thin patches", () => {
  it("builds mode-only patches for title/reactions", () => {
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "1",
        mode: "title",
        durationSec: 10,
      }),
    ).toEqual({ mode: "title" });
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "2",
        mode: "reactions",
        durationSec: 12,
      }),
    ).toEqual({ mode: "reactions" });
  });

  it("includes entity refs for question/leaderboard", () => {
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "3",
        mode: "question",
        questionId: "q1",
        durationSec: 20,
      }),
    ).toEqual({ mode: "question", questionId: "q1" });
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "4",
        mode: "leaderboard",
        leaderboardSubQuizId: "sq1",
        durationSec: 15,
      }),
    ).toEqual({ mode: "leaderboard", leaderboardSubQuizId: "sq1" });
  });

  it("fills empty timeline with default join_qr", () => {
    const t = normalizeProjectorTimelineState({ playing: true, steps: [] });
    expect(t.steps).toEqual([DEFAULT_JOIN_QR_TIMELINE_STEP]);
    expect(t.cursor).toBe(0);
  });
});
