import { describe, expect, it } from "vitest";
import {
  playerQuestionTitleFontSizeSx,
  resolvePlayerQuestionFontRem,
  resolveProjectorQuestionFontRem,
} from "./voteQuestionLayout";

describe("resolvePlayerQuestionFontRem", () => {
  it("keeps desktop size for short text", () => {
    expect(resolvePlayerQuestionFontRem(20)).toEqual({ mobile: 1.9, desktop: 2.25 });
  });

  it("shrinks size for long text", () => {
    const result = resolvePlayerQuestionFontRem(120);
    expect(result.desktop).toBeLessThan(2.25);
    expect(result.mobile).toBeLessThan(result.desktop);
  });
});

describe("playerQuestionTitleFontSizeSx", () => {
  it("returns rem strings for breakpoints", () => {
    expect(playerQuestionTitleFontSizeSx(30)).toEqual({ xs: "1.9rem", sm: "2.25rem" });
  });
});

describe("resolveProjectorQuestionFontRem", () => {
  it("scales up relative to player popup", () => {
    const player = resolvePlayerQuestionFontRem(30);
    const projector = resolveProjectorQuestionFontRem(30, 4);
    expect(projector.desktop).toBeGreaterThan(player.desktop);
  });

  it("applies penalty for many options", () => {
    const few = resolveProjectorQuestionFontRem(80, 4);
    const many = resolveProjectorQuestionFontRem(80, 10);
    expect(many.desktop).toBeLessThan(few.desktop);
  });
});
