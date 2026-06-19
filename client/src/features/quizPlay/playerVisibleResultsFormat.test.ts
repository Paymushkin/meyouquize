import { describe, expect, it } from "vitest";
import {
  formatPlayerResultStatValue,
  formatTemperatureResultHeadline,
  resolveRankingMetricMode,
} from "./playerVisibleResultsFormat";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";

describe("resolveRankingMetricMode", () => {
  it("returns null for non-ranking tiles", () => {
    expect(resolveRankingMetricMode({ type: "single" } as PlayerVisibleResultTile)).toBeNull();
  });

  it("falls back to avg_rank when tier stats missing", () => {
    expect(
      resolveRankingMetricMode({
        type: "ranking",
        rankingProjectorMetric: "avg_score",
        optionStats: [{ optionId: "o1", text: "A", count: 1, isCorrect: true }],
      } as PlayerVisibleResultTile),
    ).toBe("avg_rank");
  });
});

describe("formatTemperatureResultHeadline", () => {
  it("formats headline or returns null", () => {
    expect(formatTemperatureResultHeadline(42)).toBe("Итог: 42 / 100");
    expect(formatTemperatureResultHeadline(null)).toBeNull();
  });
});

describe("formatPlayerResultStatValue", () => {
  const row = {
    optionId: "o1",
    text: "A",
    count: 3,
    isCorrect: true,
    avgRank: 2.5,
    avgScore: 1.75,
    totalScore: 10,
  };

  it("shows vote count for temperature", () => {
    expect(formatPlayerResultStatValue(row, null, 50, "temperature")).toBe("3");
  });

  it("formats ranking metrics", () => {
    expect(formatPlayerResultStatValue(row, "avg_rank", 50)).toBe("2.50");
    expect(formatPlayerResultStatValue(row, "avg_score", 50)).toBe("1.75");
    expect(formatPlayerResultStatValue(row, "total_score", 50)).toBe("10");
  });

  it("defaults to percent label", () => {
    expect(formatPlayerResultStatValue(row, null, 33)).toBe("33%");
  });
});
