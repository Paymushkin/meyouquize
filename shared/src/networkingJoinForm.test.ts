import { describe, expect, it } from "vitest";
import {
  formatNetworkingGuestIdentity,
  getNetworkingJoinFieldVisibility,
  networkingJoinFieldPlaceholder,
  normalizeNetworkingJoinFormCopy,
  normalizeNetworkingJoinFormFields,
  normalizeNetworkingJoinFormMode,
  normalizeNetworkingPlayerTab,
  usesExtendedNetworkingJoinForm,
} from "./networkingJoinForm.js";

describe("networkingJoinForm", () => {
  it("maps legacy join modes", () => {
    expect(normalizeNetworkingJoinFormMode("simple")).toBe("interactive");
    expect(normalizeNetworkingJoinFormMode("full")).toBe("networking");
    expect(normalizeNetworkingJoinFormMode("pharma")).toBe("pharma");
  });

  it("normalizes default player tab", () => {
    expect(normalizeNetworkingPlayerTab("guests")).toBe("guests");
    expect(normalizeNetworkingPlayerTab("chats")).toBe("chats");
    expect(normalizeNetworkingPlayerTab("nope")).toBe("feed");
  });

  it("defaults join fields on", () => {
    expect(normalizeNetworkingJoinFormFields(undefined)).toEqual({
      company: true,
      offers: true,
      seeking: true,
    });
  });

  it("resolves pharma visibility", () => {
    expect(getNetworkingJoinFieldVisibility("pharma")).toMatchObject({
      showJobTitle: true,
      showCompany: true,
      companyLabel: "Номер аптеки",
      showOffers: false,
      showSeeking: false,
    });
  });

  it("resolves networking visibility from toggles", () => {
    expect(
      getNetworkingJoinFieldVisibility(
        "networking",
        { company: false, offers: true, seeking: false },
        {
          offersLabel: "Даю",
          seekingLabel: "Беру",
          offersPlaceholder: "Навыки",
          seekingPlaceholder: "",
        },
      ),
    ).toEqual({
      showJobTitle: false,
      showCompany: false,
      companyLabel: "Компания",
      showOffers: true,
      showSeeking: false,
      offersLabel: "Даю",
      seekingLabel: "Беру",
      offersPlaceholder: "Навыки",
      seekingPlaceholder: "",
    });
  });

  it("normalizes join form copy with defaults", () => {
    expect(normalizeNetworkingJoinFormCopy(undefined)).toEqual({
      offersLabel: "Чем полезен",
      seekingLabel: "Что ищу",
      offersPlaceholder: "",
      seekingPlaceholder: "",
    });
    expect(networkingJoinFieldPlaceholder("Чем полезен", "")).toBe("Чем полезен");
    expect(networkingJoinFieldPlaceholder("Чем полезен", "  Могу X  ")).toBe("Могу X");
  });

  it("hides extended fields for interactive", () => {
    expect(getNetworkingJoinFieldVisibility("interactive").showCompany).toBe(false);
    expect(usesExtendedNetworkingJoinForm(true, "interactive")).toBe(false);
    expect(usesExtendedNetworkingJoinForm(true, "pharma")).toBe(true);
    expect(usesExtendedNetworkingJoinForm(false, "pharma")).toBe(false);
  });

  it("formats guest identity", () => {
    expect(
      formatNetworkingGuestIdentity({
        fullName: " Иванова ",
        nickname: "Ann",
        jobTitle: " Провизор ",
        company: " 12 ",
      }),
    ).toBe("Иванова · Провизор · 12");
    expect(
      formatNetworkingGuestIdentity({ fullName: "", nickname: "Ann", jobTitle: "", company: "" }),
    ).toBe("Ann");
  });
});
