import { describe, expect, it } from "vitest";
import { resolveProjectorOptionRowSizes } from "./resolveProjectorOptionRowSizes";

describe("resolveProjectorOptionRowSizes", () => {
  it("handles small counts", () => {
    expect(resolveProjectorOptionRowSizes(1)).toEqual([1]);
    expect(resolveProjectorOptionRowSizes(2)).toEqual([2]);
    expect(resolveProjectorOptionRowSizes(3)).toEqual([3]);
    expect(resolveProjectorOptionRowSizes(4)).toEqual([2, 2]);
  });

  it("handles 5–9 options", () => {
    expect(resolveProjectorOptionRowSizes(5)).toEqual([3, 2]);
    expect(resolveProjectorOptionRowSizes(6)).toEqual([3, 3]);
    expect(resolveProjectorOptionRowSizes(7)).toEqual([3, 2, 2]);
    expect(resolveProjectorOptionRowSizes(8)).toEqual([3, 3, 2]);
    expect(resolveProjectorOptionRowSizes(9)).toEqual([3, 3, 3]);
  });

  it("adds full rows of three beyond nine", () => {
    expect(resolveProjectorOptionRowSizes(10)).toEqual([3, 3, 3, 1]);
    expect(resolveProjectorOptionRowSizes(11)).toEqual([3, 3, 3, 2]);
    expect(resolveProjectorOptionRowSizes(12)).toEqual([3, 3, 3, 3]);
    expect(resolveProjectorOptionRowSizes(13)).toEqual([3, 3, 3, 3, 1]);
  });
});
