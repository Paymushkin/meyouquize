import { describe, expect, it } from "vitest";
import {
  getBrandThemeVisualPatch,
  getBrandThemeVisualPreset,
  getDefaultBrandThemeVisual,
  getMeyouBrandThemeVisual,
  sanitizeBrandThemeId,
} from "./brandThemes.js";

describe("brandThemes", () => {
  it("sanitizes theme id", () => {
    expect(sanitizeBrandThemeId("meyou")).toBe("meyou");
    expect(sanitizeBrandThemeId("unknown")).toBe("default");
  });

  it("returns visual preset for meyou theme", () => {
    const visual = getBrandThemeVisualPreset("meyou");
    expect(visual.brandPrimaryColor).toBeTruthy();
    expect(visual.voteProgressBarColor).toBeTruthy();
  });

  it("returns default and meyou presets", () => {
    const defaultVisual = getDefaultBrandThemeVisual();
    const meyouVisual = getMeyouBrandThemeVisual();
    expect(defaultVisual.brandPrimaryColor).not.toBe(meyouVisual.brandPrimaryColor);
  });

  it("builds theme patch with brandTheme id", () => {
    const patch = getBrandThemeVisualPatch("meyou");
    expect(patch.brandTheme).toBe("meyou");
    expect(patch.brandLogoUrl).toBe("/logo.svg");
  });
});
