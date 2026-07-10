import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  eventThemeBrandingToPublicViewPatch,
  normalizeEventThemeBranding,
  pickEventThemeBrandingFromPublicView,
} from "./index.js";

describe("eventThemeBranding", () => {
  it("pick + normalize roundtrip keeps branding fields", () => {
    const picked = pickEventThemeBrandingFromPublicView(DEFAULT_PUBLIC_VIEW_STATE);
    const normalized = normalizeEventThemeBranding(picked);
    expect(normalized.brandTheme).toBe("default");
    expect(normalized.projectorBackground).toBe(DEFAULT_PUBLIC_VIEW_STATE.projectorBackground);
    expect(normalized.cloudTagColors).toEqual(DEFAULT_PUBLIC_VIEW_STATE.cloudTagColors);
    expect(normalized.speakerTileBackgroundColor).toBe(
      DEFAULT_PUBLIC_VIEW_STATE.speakerTileBackgroundColor,
    );
  });

  it("eventThemeBrandingToPublicViewPatch adds applied name metadata", () => {
    const branding = pickEventThemeBrandingFromPublicView(DEFAULT_PUBLIC_VIEW_STATE);
    const patch = eventThemeBrandingToPublicViewPatch(branding, "Corporate", "custom:theme-1");
    expect(patch.appliedEventThemeName).toBe("Corporate");
    expect(patch.appliedEventThemeKey).toBe("custom:theme-1");
    expect(patch.brandPrimaryColor).toBe(branding.brandPrimaryColor);
  });
});
