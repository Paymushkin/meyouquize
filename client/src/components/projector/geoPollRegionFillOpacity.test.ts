import { describe, expect, it } from "vitest";
import {
  GEO_POLL_REGION_FILL_OPACITY_MAX,
  GEO_POLL_REGION_FILL_OPACITY_MIN,
  geoPollRegionFillOpacity,
} from "./geoPollRegionFillOpacity";

describe("geoPollRegionFillOpacity", () => {
  it("returns 0 without votes", () => {
    expect(geoPollRegionFillOpacity(0, 10)).toBe(0);
    expect(geoPollRegionFillOpacity(3, 0)).toBe(0);
  });

  it("scales from min to max with vote share", () => {
    const sole = geoPollRegionFillOpacity(1, 1);
    const low = geoPollRegionFillOpacity(1, 10);
    const mid = geoPollRegionFillOpacity(5, 10);
    const max = geoPollRegionFillOpacity(10, 10);
    expect(sole).toBeCloseTo(GEO_POLL_REGION_FILL_OPACITY_MAX, 2);
    expect(low).toBeCloseTo(
      GEO_POLL_REGION_FILL_OPACITY_MIN +
        (GEO_POLL_REGION_FILL_OPACITY_MAX - GEO_POLL_REGION_FILL_OPACITY_MIN) * 0.1,
      2,
    );
    expect(max).toBeCloseTo(GEO_POLL_REGION_FILL_OPACITY_MAX, 2);
    expect(mid).toBeGreaterThan(low);
    expect(mid).toBeLessThan(max);
  });

  it("clamps above max count", () => {
    expect(geoPollRegionFillOpacity(50, 10)).toBeCloseTo(GEO_POLL_REGION_FILL_OPACITY_MAX, 2);
  });
});
