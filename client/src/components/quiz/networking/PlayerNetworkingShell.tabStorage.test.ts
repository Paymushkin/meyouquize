import { afterEach, describe, expect, it } from "vitest";
import { readStoredNetworkingTab, storeNetworkingTab } from "./PlayerNetworkingShell";

const SLUG = "test-event-tab-storage";

afterEach(() => {
  try {
    localStorage.removeItem(`mq:networking:tab:${SLUG}`);
  } catch {
    /* ignore */
  }
});

describe("networking tab storage", () => {
  it("uses admin fallback when nothing stored", () => {
    expect(readStoredNetworkingTab(SLUG, "guests")).toBe("guests");
    expect(readStoredNetworkingTab(SLUG, "chats")).toBe("chats");
    expect(readStoredNetworkingTab(SLUG)).toBe("feed");
  });

  it("prefers stored tab over fallback", () => {
    storeNetworkingTab(SLUG, "chats");
    expect(readStoredNetworkingTab(SLUG, "guests")).toBe("chats");
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem(`mq:networking:tab:${SLUG}`, "settings");
    expect(readStoredNetworkingTab(SLUG, "guests")).toBe("guests");
  });
});
