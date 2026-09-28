import { describe, expect, it } from "vitest";
import {
  DEBATE_DEFAULT_OPTION_COLORS,
  contrastingTextOnColor,
  debateDefaultOptionColor,
  sanitizeOptionColor,
} from "./optionColor.js";

describe("optionColor", () => {
  it("sanitizes hex colors", () => {
    expect(sanitizeOptionColor("#AbCdEf")).toBe("#abcdef");
    expect(sanitizeOptionColor("red")).toBeNull();
    expect(sanitizeOptionColor("bad", "#112233")).toBe("#112233");
  });

  it("returns default debate colors by index", () => {
    expect(debateDefaultOptionColor(0)).toBe(DEBATE_DEFAULT_OPTION_COLORS[0]);
    expect(debateDefaultOptionColor(99)).toBe(DEBATE_DEFAULT_OPTION_COLORS[2]);
  });

  it("picks contrasting text for light and dark fills", () => {
    expect(contrastingTextOnColor("#ffffff")).toBe("#111111");
    expect(contrastingTextOnColor("#1976d2")).toBe("#ffffff");
  });
});
