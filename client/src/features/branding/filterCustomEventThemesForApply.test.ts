import { describe, expect, it } from "vitest";
import { filterCustomEventThemesForApply } from "./filterCustomEventThemesForApply";

describe("filterCustomEventThemesForApply", () => {
  it("drops built-in system themes from apply selector list", () => {
    const filtered = filterCustomEventThemesForApply([
      { id: "default", name: "По умолчанию", system: true },
      { id: "meyou", name: "MeYOU", system: true },
      { id: "theme-1", name: "Corporate" },
      { id: "theme-2", name: "Альфа Саммит" },
    ]);
    expect(filtered).toEqual([
      { id: "theme-1", name: "Corporate" },
      { id: "theme-2", name: "Альфа Саммит" },
    ]);
  });

  it("drops system themes by id even without system flag", () => {
    expect(filterCustomEventThemesForApply([{ id: "meyou", name: "MeYOU" }])).toEqual([]);
  });
});
