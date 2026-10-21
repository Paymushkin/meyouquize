import { describe, expect, it } from "vitest";
import { networkingEnabledFromUnknown } from "../src/networking-service.js";

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
