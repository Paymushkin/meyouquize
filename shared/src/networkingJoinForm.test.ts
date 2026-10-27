import { describe, expect, it } from "vitest";
import {
  formatNetworkingGuestIdentity,
  getNetworkingJoinFieldVisibility,
  normalizeNetworkingJoinFormFields,
  normalizeNetworkingJoinFormMode,
  usesExtendedNetworkingJoinForm,
} from "./networkingJoinForm.js";

describe("networkingJoinForm", () => {
  it("maps legacy join modes", () => {
    expect(normalizeNetworkingJoinFormMode("simple")).toBe("interactive");
    expect(normalizeNetworkingJoinFormMode("full")).toBe("networking");
    expect(normalizeNetworkingJoinFormMode("pharma")).toBe("pharma");
  });

  it("defaults join fields on", () => {
    expect(normalizeNetworkingJoinFormFields(undefined)).toEqual({
      company: true,
      offers: true,
      seeking: true,
    });
  });

  it("resolves pharma visibility", () => {
    expect(getNetworkingJoinFieldVisibility("pharma")).toEqual({
      showJobTitle: true,
      showCompany: true,
      companyLabel: "Номер аптеки",
      showOffers: false,
      showSeeking: false,
    });
  });

  it("resolves networking visibility from toggles", () => {
    expect(
      getNetworkingJoinFieldVisibility("networking", {
        company: false,
        offers: true,
        seeking: false,
      }),
    ).toEqual({
      showJobTitle: false,
      showCompany: false,
      companyLabel: "Компания",
      showOffers: true,
      showSeeking: false,
    });
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
