import { describe, expect, it } from "vitest";
import {
  networkingEnabledFromUnknown,
  pinNetworkingViewerFirst,
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
