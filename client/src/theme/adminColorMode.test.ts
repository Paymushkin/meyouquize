// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import {
  ADMIN_COLOR_MODE_STORAGE_KEY,
  isAdminColorMode,
  readStoredAdminColorMode,
  writeStoredAdminColorMode,
} from "./adminColorMode";
import { createAdminAppTheme } from "./createAdminAppTheme";

describe("adminColorMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts light and dark only", () => {
    expect(isAdminColorMode("light")).toBe(true);
    expect(isAdminColorMode("dark")).toBe(true);
    expect(isAdminColorMode("system")).toBe(false);
  });

  it("defaults to dark and persists choice", () => {
    expect(readStoredAdminColorMode()).toBe("dark");
    writeStoredAdminColorMode("light");
    expect(localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY)).toBe("light");
    expect(readStoredAdminColorMode()).toBe("light");
  });
});

describe("createAdminAppTheme", () => {
  it("builds light and dark palettes", () => {
    expect(createAdminAppTheme("light").palette.mode).toBe("light");
    expect(createAdminAppTheme("dark").palette.mode).toBe("dark");
  });
});
