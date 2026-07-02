import { describe, expect, it } from "vitest";
import {
  formatVoteDistributionPercent,
  voteDistributionPercentWidth,
} from "./voteDistributionPercent.js";

describe("formatVoteDistributionPercent", () => {
  it("shows integer percent without fraction", () => {
    expect(formatVoteDistributionPercent(7, 10)).toBe("70%");
    expect(formatVoteDistributionPercent(1, 2)).toBe("50%");
  });

  it("shows one decimal when needed", () => {
    expect(formatVoteDistributionPercent(1, 3)).toBe("33,3%");
    expect(formatVoteDistributionPercent(2, 3)).toBe("66,7%");
  });

  it("returns 0% for empty totals or zero counts", () => {
    expect(formatVoteDistributionPercent(0, 10)).toBe("0%");
    expect(formatVoteDistributionPercent(5, 0)).toBe("0%");
  });
});

describe("voteDistributionPercentWidth", () => {
  it("returns raw percentage for bar width", () => {
    expect(voteDistributionPercentWidth(1, 3)).toBeCloseTo(33.333333, 5);
  });
});
