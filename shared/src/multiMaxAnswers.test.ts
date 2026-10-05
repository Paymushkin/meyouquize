import { describe, expect, it } from "vitest";
import { resolveMultiMaxAnswers } from "./multiMaxAnswers.js";

describe("resolveMultiMaxAnswers", () => {
  it("treats legacy maxAnswers=1 as unlimited", () => {
    expect(resolveMultiMaxAnswers(1, 4)).toBe(4);
  });

  it("treats missing/zero as unlimited", () => {
    expect(resolveMultiMaxAnswers(undefined, 3)).toBe(3);
    expect(resolveMultiMaxAnswers(0, 3)).toBe(3);
  });

  it("caps explicit limits to 5 by default", () => {
    expect(resolveMultiMaxAnswers(2, 4)).toBe(2);
    expect(resolveMultiMaxAnswers(3, 8)).toBe(3);
    expect(resolveMultiMaxAnswers(9, 8)).toBe(8);
  });

  it("supports a custom hard cap for feedback (up to 10)", () => {
    expect(resolveMultiMaxAnswers(7, 10, 10)).toBe(7);
    expect(resolveMultiMaxAnswers(7, 10, 5)).toBe(5);
  });

  it("treats maxAnswers >= optionCount as unlimited", () => {
    expect(resolveMultiMaxAnswers(4, 4)).toBe(4);
    expect(resolveMultiMaxAnswers(8, 8)).toBe(8);
  });
});
