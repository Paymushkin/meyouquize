import { describe, expect, it } from "vitest";
import {
  FEEDBACK_SCALE_TITLE_MAX_PX,
  playerFullWidthTileLabelSx,
  playerQuestionTitleFontSizeSx,
  resolveFeedbackScaleTitleFontPx,
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

describe("resolveFeedbackScaleTitleFontPx", () => {
  it("caps desktop size at 26px for short text", () => {
    expect(resolveFeedbackScaleTitleFontPx(30)).toEqual({ mobile: 23, desktop: 26 });
  });

  it("shrinks size for long text", () => {
    const result = resolveFeedbackScaleTitleFontPx(120);
    expect(result.desktop).toBeLessThan(FEEDBACK_SCALE_TITLE_MAX_PX);
    expect(result.mobile).toBeLessThan(result.desktop);
  });
});

describe("playerQuestionTitleFontSizeSx", () => {
  it("returns rem strings for breakpoints", () => {
    expect(playerQuestionTitleFontSizeSx(30)).toEqual({ xs: "1.9rem", sm: "2.25rem" });
  });
});

describe("playerFullWidthTileLabelSx", () => {
  it("uses bold responsive typography for full-width player tiles", () => {
    expect(playerFullWidthTileLabelSx).toEqual({
      fontWeight: 700,
      fontStyle: "normal",
      fontSize: "clamp(1.3rem, 4.2vw, 2.5rem)",
      lineHeight: 1.35,
    });
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
