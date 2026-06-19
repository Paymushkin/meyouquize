import { describe, expect, it } from "vitest";
import {
  clampTemperatureScaleValue,
  computeTemperatureWeightedAverage,
  formatTemperatureScaleLabel,
  formatTemperatureScaleValue,
  roundTemperatureScaleValue,
} from "./temperatureVote.js";

describe("temperatureVote", () => {
  it("clamps and rounds scale values", () => {
    expect(clampTemperatureScaleValue(-5)).toBe(0);
    expect(clampTemperatureScaleValue(150)).toBe(100);
    expect(roundTemperatureScaleValue(33.333)).toBe(33.3);
  });

  it("formats values for display", () => {
    expect(formatTemperatureScaleValue(42)).toBe("42");
    expect(formatTemperatureScaleValue(42.5, { fixedDecimals: true })).toBe("42.5");
    expect(formatTemperatureScaleLabel(50)).toBe("50 / 100");
    expect(formatTemperatureScaleValue(null)).toBeNull();
  });

  it("computes weighted average by vote counts", () => {
    expect(
      computeTemperatureWeightedAverage([
        { weight: 25, count: 2 },
        { weight: 75, count: 2 },
      ]),
    ).toBe(50);
    expect(computeTemperatureWeightedAverage([])).toBeNull();
  });
});
