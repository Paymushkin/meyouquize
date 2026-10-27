import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOIN_QR_TIMELINE_STEP,
  DEFAULT_PROJECTOR_TIMELINE_STATE,
  isProjectorTimelineAdvancing,
  networkingProfileSlotsForDuration,
  normalizeProjectorTimelineState,
  projectorTimelineStepToPublicViewPatch,
} from "./projectorTimeline.js";

describe("projectorTimeline", () => {
  it("defaults to join_qr timeline", () => {
    const state = normalizeProjectorTimelineState(undefined);
    expect(state.enabled).toBe(true);
    expect(state.frozen).toBe(false);
    expect(state.suppressed).toBe(false);
    expect(state.steps).toEqual([DEFAULT_JOIN_QR_TIMELINE_STEP]);
    expect(state).toEqual(DEFAULT_PROJECTOR_TIMELINE_STATE);
  });

  it("fills empty steps with default join_qr", () => {
    const state = normalizeProjectorTimelineState({
      enabled: true,
      playing: false,
      cursor: 0,
      steps: [],
    });
    expect(state.steps).toEqual([DEFAULT_JOIN_QR_TIMELINE_STEP]);
    expect(state.frozen).toBe(false);
    expect(state.suppressed).toBe(false);
  });

  it("sanitizes steps and clamps cursor", () => {
    const state = normalizeProjectorTimelineState({
      enabled: true,
      playing: true,
      frozen: true,
      suppressed: true,
      cursor: 99,
      stepStartedAt: 123,
      steps: [
        { id: "a", mode: "title", durationSec: 5 },
        { mode: "question", questionId: "q1", durationSec: 1 },
        { mode: "nope", durationSec: 10 },
        { id: "n", mode: "networking_profiles", durationSec: 12 },
        { id: "q", mode: "join_qr", durationSec: 20 },
        { id: "pw", mode: "photo_wall", durationSec: 30 },
        { id: "vw", mode: "video_wall", durationSec: 40 },
      ],
    });
    expect(state.enabled).toBe(true);
    expect(state.frozen).toBe(true);
    expect(state.suppressed).toBe(true);
    // title/question → networking_profiles; nope отброшен; photo/video wall сохраняются
    expect(state.steps).toHaveLength(6);
    expect(state.steps[0]?.mode).toBe("networking_profiles");
    expect(state.steps[1]?.mode).toBe("networking_profiles");
    expect(state.steps[1]?.durationSec).toBe(3);
    expect(state.steps[2]?.mode).toBe("networking_profiles");
    expect(state.steps[3]?.mode).toBe("join_qr");
    expect(state.steps[4]?.mode).toBe("photo_wall");
    expect(state.steps[5]?.mode).toBe("video_wall");
    expect(state.cursor).toBe(5);
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
    expect(
      projectorTimelineStepToPublicViewPatch({
        id: "3",
        mode: "networking_stats",
        durationSec: 15,
      }),
    ).toEqual({ mode: "networking_stats" });
  });

  it("computes profile slots from duration", () => {
    expect(networkingProfileSlotsForDuration(12)).toBe(3);
    expect(networkingProfileSlotsForDuration(16)).toBe(4);
    expect(networkingProfileSlotsForDuration(3)).toBe(1);
    expect(networkingProfileSlotsForDuration(4)).toBe(1);
    expect(networkingProfileSlotsForDuration(8)).toBe(2);
  });

  it("advancing requires enabled, steps, not frozen, not suppressed", () => {
    expect(isProjectorTimelineAdvancing(DEFAULT_PROJECTOR_TIMELINE_STATE)).toBe(true);
    expect(
      isProjectorTimelineAdvancing({
        ...DEFAULT_PROJECTOR_TIMELINE_STATE,
        frozen: true,
      }),
    ).toBe(false);
    expect(
      isProjectorTimelineAdvancing({
        ...DEFAULT_PROJECTOR_TIMELINE_STATE,
        suppressed: true,
      }),
    ).toBe(false);
  });
});
