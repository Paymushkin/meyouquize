import { describe, expect, it } from "vitest";
import {
  clampTemperatureScaleValue,
  computeTemperatureWeightedAverage,
  formatTemperatureScaleLabel,
  formatTemperatureScaleValue,
  roundTemperatureScaleValue,
} from "@meyouquize/shared";

describe("computeTemperatureWeightedAverage", () => {
  it("returns null when there are no votes", () => {
    expect(computeTemperatureWeightedAverage([])).toBeNull();
    expect(computeTemperatureWeightedAverage([{ count: 0, weight: 50 }])).toBeNull();
  });

  it("returns the weight for a single voted option", () => {
    expect(computeTemperatureWeightedAverage([{ count: 3, weight: 75 }])).toBe(75);
  });

  it("computes weighted average and rounds to 0.1", () => {
    expect(
      computeTemperatureWeightedAverage([
        { count: 2, weight: 25 },
        { count: 2, weight: 75 },
      ]),
    ).toBe(50);
    expect(
      computeTemperatureWeightedAverage([
        { count: 1, weight: 0 },
        { count: 2, weight: 100 },
      ]),
    ).toBe(66.7);
  });
});

describe("temperature scale formatting", () => {
  it("clamps values to 0–100", () => {
    expect(clampTemperatureScaleValue(-5)).toBe(0);
    expect(clampTemperatureScaleValue(150)).toBe(100);
    expect(roundTemperatureScaleValue(100.04)).toBe(100);
  });

  it("formats integers without trailing decimal", () => {
    expect(formatTemperatureScaleValue(50)).toBe("50");
    expect(formatTemperatureScaleLabel(72)).toBe("72 / 100");
  });

  it("formats fractional values with one decimal", () => {
    expect(formatTemperatureScaleValue(59.1)).toBe("59.1");
    expect(formatTemperatureScaleLabel(43.8)).toBe("43.8 / 100");
  });

  it("supports fixed decimals for stable projector layout", () => {
    expect(formatTemperatureScaleValue(59, { fixedDecimals: true })).toBe("59.0");
  });

  it("returns null for invalid input", () => {
    expect(formatTemperatureScaleValue(null)).toBeNull();
    expect(formatTemperatureScaleLabel(undefined)).toBeNull();
  });
});
