import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECTOR_TIMELINE_STATE,
  normalizeProjectorTimelineState,
  projectorTimelineStepToPublicViewPatch,
} from "./projectorTimeline.js";

describe("projectorTimeline", () => {
  it("defaults empty timeline", () => {
    expect(normalizeProjectorTimelineState(undefined)).toEqual(DEFAULT_PROJECTOR_TIMELINE_STATE);
  });

  it("sanitizes steps and clamps cursor", () => {
    const state = normalizeProjectorTimelineState({
      enabled: true,
      playing: true,
      cursor: 99,
      stepStartedAt: 123,
      steps: [
        { id: "a", mode: "title", durationSec: 5 },
        { mode: "question", questionId: "q1", durationSec: 1 },
        { mode: "nope", durationSec: 10 },
      ],
    });
    expect(state.enabled).toBe(true);
    expect(state.steps).toHaveLength(2);
    expect(state.steps[1]?.durationSec).toBe(3);
    expect(state.cursor).toBe(1);
    expect(state.stepStartedAt).toBe(123);
  });

  it("maps step to thin publicView patch", () => {
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "1",
        mode: "question",
        questionId: "q-9",
        durationSec: 10,
      }),
    ).toEqual({ mode: "question", questionId: "q-9" });
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "2",
        mode: "title",
        durationSec: 10,
      }),
    ).toEqual({ mode: "title" });
  });
});
