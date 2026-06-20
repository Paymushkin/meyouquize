import { describe, expect, it } from "vitest";
import {
  buildVoteQuestionTextGradient,
  isValidVoteQuestionTextColor,
  isVoteQuestionTextGradient,
  parseVoteQuestionTextGradient,
  sanitizeVoteFillColor,
  sanitizeVoteQuestionTextColor,
  voteFillOutlineColor,
  voteProgressBarFillStyle,
  voteProgressTrackBackground,
  voteQuestionTextTypographyStyle,
} from "./voteQuestionTextStyle.js";

describe("voteQuestionTextStyle", () => {
  it("validates hex and gradient colors", () => {
    expect(isValidVoteQuestionTextColor("#aabbcc")).toBe(true);
    expect(isValidVoteQuestionTextColor("linear-gradient(135deg, #ffffff 0%, #000000 100%)")).toBe(
      true,
    );
    expect(isValidVoteQuestionTextColor("red")).toBe(false);
  });

  it("builds and parses gradient", () => {
    const gradient = buildVoteQuestionTextGradient("#111111", "#222222", 90);
    expect(parseVoteQuestionTextGradient(gradient)).toEqual({
      deg: 90,
      from: "#111111",
      to: "#222222",
    });
  });

  it("sanitizes invalid values to fallback", () => {
    expect(sanitizeVoteQuestionTextColor("bad", "#ffffff")).toBe("#ffffff");
    expect(sanitizeVoteFillColor(undefined, "#000000")).toBe("#000000");
  });

  it("returns typography style for gradient text", () => {
    const style = voteQuestionTextTypographyStyle(
      "linear-gradient(180deg, #ffffff 0%, #cccccc 100%)",
    );
    expect(style.WebkitBackgroundClip).toBe("text");
  });

  it("returns solid color typography for hex", () => {
    const style = voteQuestionTextTypographyStyle("#aabbcc");
    expect(style.color).toBe("#aabbcc");
  });

  it("styles progress bar fill and track", () => {
    expect(voteProgressBarFillStyle("#1976d2")).toEqual({ backgroundColor: "#1976d2" });
    const gradient = buildVoteQuestionTextGradient("#111111", "#222222", 45);
    expect(voteProgressBarFillStyle(gradient)).toEqual({ background: gradient });
    expect(voteFillOutlineColor(gradient)).toBe("#111111");
    expect(voteProgressTrackBackground("#1976d2")).toMatch(/^rgba\(25,\s*118,\s*210,/);
  });

  it("detects gradient strings", () => {
    expect(isVoteQuestionTextGradient(" linear-gradient(90deg, #fff 0%, #000 100%)")).toBe(true);
    expect(isVoteQuestionTextGradient("#ffffff")).toBe(false);
  });
});
