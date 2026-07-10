import { describe, expect, it, vi } from "vitest";
import { applyEventThemeSelection } from "./applyEventThemeSelection";

describe("applyEventThemeSelection", () => {
  it("applies built-in preset from API branding", async () => {
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
    const branding = {
      brandTheme: "meyou" as const,
      brandPrimaryColor: "#F3F722",
      speakerTileBackgroundColor: "#F3F722",
      speakerTileTextColor: "#000000",
      programTileBackgroundColor: "#FFFFFF",
      programTileTextColor: "#000000",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ branding }),
      }),
    );

    await applyEventThemeSelection({
      selection: { kind: "preset", theme: "meyou" },
      apiBase: "http://test",
      emitBrandingPatch,
      applyFromEventThemeBranding,
      applyBrandThemeLocally,
      tileBrandSetters,
      onAppliedName,
    });

    expect(applyFromEventThemeBranding).toHaveBeenCalledWith(branding);
    expect(applyBrandThemeLocally).toHaveBeenCalledWith("meyou");
    expect(emitBrandingPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        brandPrimaryColor: "#F3F722",
        appliedEventThemeName: "MeYOU",
        appliedEventThemeKey: "meyou",
      }),
    );
    expect(onAppliedName).toHaveBeenCalledWith("MeYOU");

    vi.unstubAllGlobals();
  });
});
