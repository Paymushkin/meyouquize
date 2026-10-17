import { describe, expect, it } from "vitest";
import {
  allocateVotesByShares,
  adaptWeightsToOptionCount,
  pickOptionIndex,
  weightsAtProgress,
} from "../scripts/debate-poll-sweep.mjs";

describe("allocateVotesByShares", () => {
  it("matches total and respects leader share", () => {
    const counts = allocateVotesByShares([100, 0, 0], 24);
    expect(counts).toEqual([24, 0, 0]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(24);
  });
});

describe("live vote weighting", () => {
  it("shifts preference from first to third option over time", () => {
    const early = weightsAtProgress(0);
    const late = weightsAtProgress(1);
    expect(early[0]).toBeGreaterThan(early[2]!);
    expect(late[2]).toBeGreaterThan(late[0]!);
  });

  it("adapts weights to two options", () => {
    const w = adaptWeightsToOptionCount([0.5, 0.3, 0.2], 2);
    expect(w).toHaveLength(2);
    expect(w[0]! + w[1]!).toBeCloseTo(1, 5);
  });

  it("picks by weights", () => {
    expect(pickOptionIndex([1, 0, 0], () => 0.1)).toBe(0);
    expect(pickOptionIndex([0, 1, 0], () => 0.1)).toBe(1);
  });
});
