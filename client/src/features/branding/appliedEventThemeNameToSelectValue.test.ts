import { describe, expect, it } from "vitest";
import {
  appliedEventThemeNameToSelectValue,
  resolveEventThemeSelectValue,
  type EventThemeListOption,
} from "../../components/admin/branding/EventThemeApplySection";

const customThemes: EventThemeListOption[] = [
  { id: "theme-1", name: "Corporate" },
  { id: "theme-2", name: "Alfa" },
];

describe("appliedEventThemeNameToSelectValue", () => {
  it("maps preset labels", () => {
    expect(appliedEventThemeNameToSelectValue("MeYOU", customThemes)).toBe("meyou");
    expect(appliedEventThemeNameToSelectValue("По умолчанию", customThemes)).toBe("default");
  });

  it("maps custom theme by name", () => {
    expect(appliedEventThemeNameToSelectValue("Corporate", customThemes)).toBe("custom:theme-1");
  });

  it("falls back to brandTheme when name is missing", () => {
    expect(appliedEventThemeNameToSelectValue(undefined, customThemes, "meyou")).toBe("meyou");
  });

  it("prefers stored theme key over name and brandTheme", () => {
    expect(resolveEventThemeSelectValue("custom:theme-2", "Corporate", customThemes, "meyou")).toBe(
      "custom:theme-2",
    );
    expect(resolveEventThemeSelectValue("meyou", "Corporate", customThemes, "default")).toBe(
      "meyou",
    );
  });
});
