import { describe, expect, it } from "vitest";
import {
  buildDebateSideBySideRows,
  debateSideBySideSegmentColors,
  debateSideBySideSegmentWidths,
  formatDebatePercentLabel,
} from "./ProjectorDebateSideBySideChart";

describe("buildDebateSideBySideRows", () => {
  it("computes percents and labels", () => {
    const rows = buildDebateSideBySideRows(
      [
        { optionId: "a", text: "A", count: 40, color: "#112233" },
        { optionId: "b", text: "B", count: 60 },
      ],
      false,
    );
    expect(rows[0]?.percent).toBe(40);
    expect(rows[0]?.color).toBe("#112233");
    expect(rows[1]?.percentLabel).toBe("60%");
  });
});

describe("formatDebatePercentLabel", () => {
  it("omits tenths when they are zero", () => {
    expect(formatDebatePercentLabel(100)).toBe("100%");
    expect(formatDebatePercentLabel(0)).toBe("0%");
    expect(formatDebatePercentLabel(33.333)).toBe("33.3%");
  });
});

describe("debateSideBySideSegmentColors", () => {
  it("prefers saved option colors", () => {
    const colors = debateSideBySideSegmentColors([
      { text: "Вариант A", color: "#00ff00" },
      { text: "Вариант B", color: "#ff00ff" },
      { text: "Не определился", color: "#abcdef" },
    ]);
    expect(colors).toEqual(["#00ff00", "#ff00ff", "#abcdef"]);
  });

  it("falls back to the same defaults as admin when color missing", () => {
    const colors = debateSideBySideSegmentColors([
      { text: "Вариант A" },
      { text: "Вариант B" },
      { text: "Не определился" },
    ]);
    expect(colors).toEqual(["#1976d2", "#c62828", "#90a4ae"]);
  });
});

describe("debateSideBySideSegmentWidths", () => {
  it("keeps proportions when all options have votes", () => {
    const widths = debateSideBySideSegmentWidths([25, 50, 25], 100);
    expect(widths[0]).toBeCloseTo(25, 5);
    expect(widths[1]).toBeCloseTo(50, 5);
    expect(widths[2]).toBeCloseTo(25, 5);
  });

  it("keeps zero options visible so a leader never fills the whole scale", () => {
    const widths = debateSideBySideSegmentWidths([100, 0, 0], 100);
    expect(widths).toHaveLength(3);
    expect(widths[0]).toBeLessThan(100);
    expect(widths[1]).toBeGreaterThan(0);
    expect(widths[2]).toBeGreaterThan(0);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  it("splits evenly when there are no votes", () => {
    const widths = debateSideBySideSegmentWidths([0, 0, 0], 0);
    expect(widths[0]).toBeCloseTo(100 / 3, 5);
    expect(widths[1]).toBeCloseTo(100 / 3, 5);
    expect(widths[2]).toBeCloseTo(100 / 3, 5);
  });
});
