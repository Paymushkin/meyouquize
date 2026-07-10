import { describe, expect, it, vi } from "vitest";
import { getBrandThemeVisualPatch } from "@meyouquize/shared";
import { applyEventThemeSelection } from "./applyEventThemeSelection";

describe("applyEventThemeSelection", () => {
  it("applies built-in preset via emitBrandingPatch snapshot", async () => {
    const emitBrandingPatch = vi.fn();
    const applyBrandThemeLocally = vi.fn();
    const applyFromEventThemeBranding = vi.fn();
    const onAppliedName = vi.fn();
    const tileBrandSetters = {
      setSpeakerTileBackgroundColor: vi.fn(),
      setSpeakerTileTextColor: vi.fn(),
      setProgramTileBackgroundColor: vi.fn(),
      setProgramTileTextColor: vi.fn(),
    };

    await applyEventThemeSelection({
      selection: { kind: "preset", theme: "meyou" },
      apiBase: "http://test",
      emitBrandingPatch,
      applyFromEventThemeBranding,
      applyBrandThemeLocally,
      brandThemeVisualSetters: {
        setProjectorBackground: vi.fn(),
        setVoteQuestionTextColor: vi.fn(),
        setVoteOptionTextColor: vi.fn(),
        setVoteProgressTrackColor: vi.fn(),
        setVoteProgressBarColor: vi.fn(),
        setPlayerVoteOptionTextColor: vi.fn(),
        setPlayerVoteProgressTrackColor: vi.fn(),
        setPlayerVoteProgressBarColor: vi.fn(),
        setBrandPrimaryColor: vi.fn(),
        setBrandAccentColor: vi.fn(),
        setBrandSurfaceColor: vi.fn(),
        setBrandTextColor: vi.fn(),
        setBrandInputTextColor: vi.fn(),
        setBrandFontFamily: vi.fn(),
        setBrandFontUrl: vi.fn(),
        setBrandLogoUrl: vi.fn(),
        setBrandPlayerBackgroundImageUrl: vi.fn(),
        setBrandProjectorBackgroundImageUrl: vi.fn(),
        setBrandBodyBackgroundColor: vi.fn(),
        ...tileBrandSetters,
      },
      tileBrandSetters,
      onAppliedName,
    });

    expect(applyBrandThemeLocally).toHaveBeenCalledWith("meyou");
    expect(emitBrandingPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        ...getBrandThemeVisualPatch("meyou"),
        appliedEventThemeName: "MeYOU",
        appliedEventThemeKey: "meyou",
      }),
    );
    expect(onAppliedName).toHaveBeenCalledWith("MeYOU");
    expect(applyFromEventThemeBranding).not.toHaveBeenCalled();
  });
});
