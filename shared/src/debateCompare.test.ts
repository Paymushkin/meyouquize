import { describe, expect, it } from "vitest";
import {
  buildDebateCompareRows,
  formatDebateSwingLabel,
  groupDebateSeriesQuestionIds,
  singlePollDebateSideBySideEligible,
  sumDebateSeriesOptionStats,
} from "./debateCompare.js";

describe("buildDebateCompareRows", () => {
  it("computes delta between baseline and final", () => {
    const rows = buildDebateCompareRows(
      [
        { optionId: "a", text: "За A", count: 40 },
        { optionId: "b", text: "За B", count: 30 },
        { optionId: "u", text: "Не определился", count: 30 },
      ],
      [
        { optionId: "a2", text: "За A", count: 22 },
        { optionId: "b2", text: "За B", count: 48 },
        { optionId: "u2", text: "Не определился", count: 30 },
      ],
    );
    expect(rows[0]?.baselinePercent).toBe(40);
    expect(rows[1]?.finalPercent).toBe(48);
    expect(rows[1]?.deltaPp).toBeCloseTo(18, 5);
  });
});

describe("formatDebateSwingLabel", () => {
  it("prefers side B when it gains more", () => {
    const rows = buildDebateCompareRows(
      [
        { optionId: "a", text: "A", count: 50 },
        { optionId: "b", text: "B", count: 50 },
      ],
      [
        { optionId: "a2", text: "A", count: 32 },
        { optionId: "b2", text: "B", count: 68 },
      ],
    );
    expect(formatDebateSwingLabel(rows)).toBe("+18 п.п. в пользу «B»");
  });
});

describe("sumDebateSeriesOptionStats", () => {
  it("sums counts by side slot index", () => {
    const summed = sumDebateSeriesOptionStats([
      [
        { optionId: "a1", text: "A", count: 10, color: "#111111" },
        { optionId: "b1", text: "B", count: 5 },
      ],
      [
        { optionId: "a2", text: "A", count: 3, color: "#222222" },
        { optionId: "b2", text: "B", count: 7 },
      ],
    ]);
    expect(summed.map((r) => r.count)).toEqual([13, 12]);
    expect(summed[0]?.color).toBe("#222222");
  });
});

describe("groupDebateSeriesQuestionIds", () => {
  it("orders rounds by debateRoundIndex", () => {
    const map = groupDebateSeriesQuestionIds([
      { questionId: "q2", debateSeriesId: "s1", debateRoundIndex: 1 },
      { questionId: "q1", debateSeriesId: "s1", debateRoundIndex: 0 },
      { questionId: "x", debateSeriesId: null },
    ]);
    expect(map.get("s1")).toEqual(["q1", "q2"]);
  });
});
