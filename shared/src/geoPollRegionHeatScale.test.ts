import { describe, expect, it } from "vitest";
import {
  DEFAULT_GEO_POLL_REGION_HEAT_SCALE,
  geoPollRegionHeatIntensity,
  geoPollRegionHeatLegendCssGradient,
  normalizeGeoPollRegionHeatScale,
  resolveGeoPollRegionHeatFillColor,
  resolveGeoPollRegionHeatFillOpacity,
} from "./geoPollRegionHeatScale.js";

describe("geoPollRegionHeatScale", () => {
  it("defaults and normalizes unknown values", () => {
    expect(DEFAULT_GEO_POLL_REGION_HEAT_SCALE).toBe("region");
    expect(normalizeGeoPollRegionHeatScale("cold_warm")).toBe("cold_warm");
    expect(normalizeGeoPollRegionHeatScale("nope")).toBe("region");
  });

  it("uses region highlight color for region scale", () => {
    expect(resolveGeoPollRegionHeatFillColor("region", 0.5, "#c6c21a")).toBe("#c6c21a");
    expect(resolveGeoPollRegionHeatFillOpacity("region", 0)).toBe(0);
    expect(resolveGeoPollRegionHeatFillOpacity("region", 1)).toBeCloseTo(0.95, 2);
    expect(resolveGeoPollRegionHeatFillOpacity("region", 0.1)).toBeCloseTo(0.28 + 0.67 * 0.1, 2);
  });

  it("interpolates cold_warm toward warm end at high intensity", () => {
    const low = resolveGeoPollRegionHeatFillColor("cold_warm", 0, "#ffffff");
    const high = resolveGeoPollRegionHeatFillColor("cold_warm", 1, "#ffffff");
    expect(low.toLowerCase()).toBe("#2b6cb0");
    expect(high.toLowerCase()).toBe("#e53e3e");
    expect(resolveGeoPollRegionHeatFillOpacity("cold_warm", 0.5)).toBeGreaterThan(0.85);
  });

  it("builds legend gradients", () => {
    expect(geoPollRegionHeatLegendCssGradient("region", "#aabbcc")).toContain("rgba(");
    expect(geoPollRegionHeatLegendCssGradient("magma", "#aabbcc")).toContain("linear-gradient");
    expect(geoPollRegionHeatIntensity(5, 10)).toBe(0.5);
    expect(geoPollRegionHeatIntensity(0, 10)).toBe(0);
  });
});
