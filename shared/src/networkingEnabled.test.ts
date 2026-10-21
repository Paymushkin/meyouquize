import { describe, expect, it } from "vitest";
import { normalizePublicViewState } from "./index.js";

describe("networkingEnabled in publicView", () => {
  it("defaults off and preserves true", () => {
    expect(normalizePublicViewState(null).networkingEnabled).toBe(false);
    expect(normalizePublicViewState({ networkingEnabled: true }).networkingEnabled).toBe(true);
  });
});
