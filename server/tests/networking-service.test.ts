import { describe, expect, it } from "vitest";
import {
  networkingEnabledFromUnknown,
  networkingGuestHasFilledFields,
  pinNetworkingViewerFirst,
  sortNetworkingGuestsFilledThenNewest,
} from "../src/networking-service.js";

describe("networkingEnabledFromUnknown", () => {
  it("defaults to false", () => {
    expect(networkingEnabledFromUnknown(null)).toBe(false);
    expect(networkingEnabledFromUnknown({})).toBe(false);
    expect(networkingEnabledFromUnknown({ networkingEnabled: false })).toBe(false);
  });

  it("reads true from publicView", () => {
    expect(networkingEnabledFromUnknown({ networkingEnabled: true })).toBe(true);
  });
});

describe("networkingGuestHasFilledFields", () => {
  it("is false when all profile fields empty", () => {
    expect(
      networkingGuestHasFilledFields({
        fullName: " ",
        jobTitle: "",
        company: "",
        offers: "",
        seeking: "",
        phone: "",
        email: "",
      }),
    ).toBe(false);
  });

  it("is true when any profile field has text", () => {
    expect(
      networkingGuestHasFilledFields({
        fullName: "",
        jobTitle: "",
        company: "",
        offers: "консалтинг",
        seeking: "",
        phone: "",
        email: "",
      }),
    ).toBe(true);
  });
});

describe("sortNetworkingGuestsFilledThenNewest", () => {
  it("puts filled profiles above empty, newer first within group", () => {
    const empty = {
      fullName: "",
      jobTitle: "",
      company: "",
      offers: "",
      seeking: "",
      phone: "",
      email: "",
    };
    const filled = { ...empty, offers: "x" };
    const rows = [
      { participantId: "empty-new", ...empty, createdAtMs: 300 },
      { participantId: "filled-old", ...filled, createdAtMs: 100 },
      { participantId: "filled-new", ...filled, createdAtMs: 200 },
      { participantId: "empty-old", ...empty, createdAtMs: 50 },
    ];
    expect(sortNetworkingGuestsFilledThenNewest(rows).map((r) => r.participantId)).toEqual([
      "filled-new",
      "filled-old",
      "empty-new",
      "empty-old",
    ]);
  });
});

describe("pinNetworkingViewerFirst", () => {
  it("moves viewer to the front without changing relative order of others", () => {
    const rows = [
      { participantId: "new" },
      { participantId: "mid" },
      { participantId: "self" },
      { participantId: "old" },
    ];
    expect(pinNetworkingViewerFirst(rows, "self").map((r) => r.participantId)).toEqual([
      "self",
      "new",
      "mid",
      "old",
    ]);
  });

  it("keeps list when viewer already first or missing", () => {
    const rows = [{ participantId: "a" }, { participantId: "b" }];
    expect(pinNetworkingViewerFirst(rows, "a")).toEqual(rows);
    expect(pinNetworkingViewerFirst(rows, "missing")).toEqual(rows);
    expect(pinNetworkingViewerFirst(rows, "")).toEqual(rows);
  });
});
