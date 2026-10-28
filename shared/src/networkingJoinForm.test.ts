import { describe, expect, it } from "vitest";
import {
  formatNetworkingGuestIdentity,
  getNetworkingJoinFieldVisibility,
  networkingJoinFieldPlaceholder,
  isValidNetworkingEmail,
  isValidNetworkingPhone,
  normalizeNetworkingJoinFormCopy,
  normalizeNetworkingJoinFormFields,
  normalizeNetworkingJoinFormMode,
  normalizeNetworkingPlayerTab,
  usesExtendedNetworkingJoinForm,
  validateNetworkingJoinDraft,
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
      phone: false,
      email: false,
      companyRequired: false,
      offersRequired: false,
      seekingRequired: false,
      phoneRequired: false,
      emailRequired: false,
    });
  });

  it("clears required when field is hidden", () => {
    expect(
      normalizeNetworkingJoinFormFields({
        company: false,
        companyRequired: true,
        offers: true,
        offersRequired: true,
      }),
    ).toMatchObject({
      company: false,
      companyRequired: false,
      offers: true,
      offersRequired: true,
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
        {
          company: false,
          offers: true,
          seeking: false,
          phone: true,
          email: false,
          companyRequired: false,
          offersRequired: true,
          seekingRequired: false,
          phoneRequired: true,
          emailRequired: false,
        },
        {
          offersLabel: "Даю",
          seekingLabel: "Беру",
          offersPlaceholder: "Навыки",
          seekingPlaceholder: "",
          privacyPolicyUrl: "",
        },
      ),
    ).toEqual({
      showJobTitle: false,
      showCompany: false,
      companyLabel: "Компания",
      companyRequired: false,
      showOffers: true,
      offersRequired: true,
      showSeeking: false,
      seekingRequired: false,
      showPhone: true,
      phoneRequired: true,
      showEmail: false,
      emailRequired: false,
      offersLabel: "Даю",
      seekingLabel: "Беру",
      offersPlaceholder: "Навыки",
      seekingPlaceholder: "",
    });
  });

  it("validates required networking fields", () => {
    const fields = {
      company: true,
      offers: true,
      seeking: false,
      phone: false,
      email: false,
      companyRequired: true,
      offersRequired: false,
      seekingRequired: false,
      phoneRequired: false,
      emailRequired: false,
    };
    const empty = {
      fullName: "",
      jobTitle: "",
      company: "",
      offers: "",
      seeking: "",
      phone: "",
      email: "",
    };
    expect(validateNetworkingJoinDraft("networking", fields, empty)).toBe("Укажите ФИО");
    expect(
      validateNetworkingJoinDraft("networking", fields, { ...empty, fullName: "Иванов" }),
    ).toBe("Укажите Компания");
    expect(
      validateNetworkingJoinDraft("networking", fields, {
        ...empty,
        fullName: "Иванов",
        company: "ООО",
      }),
    ).toBeNull();
    expect(networkingJoinFieldPlaceholder("Компания", "", true)).toBe("Компания *");
  });

  it("validates phone and email format when fields are shown", () => {
    expect(isValidNetworkingPhone("+7 (999) 123-45-67")).toBe(true);
    expect(isValidNetworkingPhone("89991234567")).toBe(true);
    expect(isValidNetworkingPhone("123")).toBe(false);
    expect(isValidNetworkingPhone("abc")).toBe(false);
    expect(isValidNetworkingEmail("a@b.co")).toBe(true);
    expect(isValidNetworkingEmail("bad@")).toBe(false);
    expect(isValidNetworkingEmail("not-mail")).toBe(false);

    const fields = {
      company: false,
      offers: false,
      seeking: false,
      phone: true,
      email: true,
      companyRequired: false,
      offersRequired: false,
      seekingRequired: false,
      phoneRequired: false,
      emailRequired: false,
    };
    const base = {
      fullName: "Иванов",
      jobTitle: "",
      company: "",
      offers: "",
      seeking: "",
      phone: "",
      email: "",
    };
    expect(validateNetworkingJoinDraft("networking", fields, { ...base, phone: "12" })).toBe(
      "Некорректный телефон",
    );
    expect(validateNetworkingJoinDraft("networking", fields, { ...base, email: "bad" })).toBe(
      "Некорректная почта",
    );
    expect(
      validateNetworkingJoinDraft("networking", { ...fields, phoneRequired: true }, base),
    ).toBe("Укажите телефон");
    expect(
      validateNetworkingJoinDraft("networking", fields, {
        ...base,
        phone: "+79991234567",
        email: "a@b.co",
      }),
    ).toBeNull();
  });

  it("normalizes join form copy with defaults", () => {
    expect(normalizeNetworkingJoinFormCopy(undefined)).toEqual({
      offersLabel: "Чем полезен",
      seekingLabel: "Что ищу",
      offersPlaceholder: "",
      seekingPlaceholder: "",
      privacyPolicyUrl: "",
    });
    expect(
      normalizeNetworkingJoinFormCopy({
        privacyPolicyUrl: " https://example.com/pd ",
      }).privacyPolicyUrl,
    ).toBe("https://example.com/pd");
    expect(
      normalizeNetworkingJoinFormCopy({ privacyPolicyUrl: "example.com/pd" }).privacyPolicyUrl,
    ).toBe("https://example.com/pd");
    expect(
      normalizeNetworkingJoinFormCopy({ privacyPolicyUrl: "javascript:alert(1)" }).privacyPolicyUrl,
    ).toBe("");
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
