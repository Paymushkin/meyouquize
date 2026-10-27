import { describe, expect, it } from "vitest";
import { normalizePublicViewState } from "./index.js";

describe("networkingEnabled in publicView", () => {
  it("defaults off and preserves true", () => {
    expect(normalizePublicViewState(null).networkingEnabled).toBe(false);
    expect(normalizePublicViewState({ networkingEnabled: true }).networkingEnabled).toBe(true);
  });

  it("defaults networking join form to interactive and maps legacy modes", () => {
    expect(normalizePublicViewState(null).networkingJoinFormMode).toBe("interactive");
    expect(
      normalizePublicViewState({ networkingJoinFormMode: "simple" }).networkingJoinFormMode,
    ).toBe("interactive");
    expect(
      normalizePublicViewState({ networkingJoinFormMode: "full" }).networkingJoinFormMode,
    ).toBe("networking");
    expect(
      normalizePublicViewState({ networkingJoinFormMode: "pharma" }).networkingJoinFormMode,
    ).toBe("pharma");
  });

  it("defaults networking join form fields on", () => {
    expect(normalizePublicViewState(null).networkingJoinFormFields).toEqual({
      company: true,
      offers: true,
      seeking: true,
    });
    expect(
      normalizePublicViewState({
        networkingJoinFormFields: { company: false, offers: true, seeking: false },
      }).networkingJoinFormFields,
    ).toEqual({ company: false, offers: true, seeking: false });
  });

  it("inherits networking icon colors from brand; remaps legacy #1976d2", () => {
    const view = normalizePublicViewState({
      brandPrimaryColor: "#7c5acb",
      brandAccentColor: "#e91e63",
    });
    expect(view.networkingProjectorIconColor).toBe("#7c5acb");
    expect(view.networkingNavIconColor).toBe("#e91e63");

    const legacy = normalizePublicViewState({
      brandPrimaryColor: "#7c5acb",
      brandAccentColor: "#e91e63",
      networkingProjectorIconColor: "#1976d2",
      networkingNavIconColor: "#1976d2",
    });
    expect(legacy.networkingProjectorIconColor).toBe("#7c5acb");
    expect(legacy.networkingNavIconColor).toBe("#e91e63");

    const custom = normalizePublicViewState({
      brandPrimaryColor: "#7c5acb",
      brandAccentColor: "#e91e63",
      networkingProjectorIconColor: "#00ff00",
      networkingNavIconColor: "#0000ff",
    });
    expect(custom.networkingProjectorIconColor).toBe("#00ff00");
    expect(custom.networkingNavIconColor).toBe("#0000ff");
  });
});
