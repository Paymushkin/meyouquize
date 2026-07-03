import { describe, expect, it } from "vitest";
import { inferFontFaceDescriptor } from "@meyouquize/shared";
import {
  buildBrandFontPatchForSelection,
  collectFontUrlsForFamily,
  familyOptionLabel,
  listFontFamilyOptions,
} from "./fontPickerUtils";

describe("fontPickerUtils", () => {
  it("collects all urls for static family", () => {
    const fonts = [
      { id: "1", family: "Styrene", url: "/media/a.woff2", kind: "static" as const },
      { id: "2", family: "Styrene", url: "/media/b.woff2", kind: "static" as const },
    ];
    expect(collectFontUrlsForFamily("Styrene", fonts)).toEqual([
      "/media/a.woff2",
      "/media/b.woff2",
    ]);
  });

  it("builds patch snapshot for custom family", () => {
    const fonts = [
      { id: "1", family: "Styrene", url: "/media/a.woff2", kind: "static" as const },
      { id: "2", family: "Styrene", url: "/media/b.woff2", kind: "static" as const },
    ];
    const patch = buildBrandFontPatchForSelection('"Styrene", Arial, sans-serif', fonts);
    expect(patch.brandFontUrls).toEqual(["/media/a.woff2", "/media/b.woff2"]);
    expect(patch.brandFontUrl).toBe("/media/a.woff2");
  });

  it("labels variable and static families", () => {
    const options = listFontFamilyOptions([
      { id: "1", family: "Var", url: "/media/v.woff2", kind: "variable" },
      { id: "2", family: "Set", url: "/media/a.woff2", kind: "static" },
      { id: "3", family: "Set", url: "/media/b.woff2", kind: "static" },
    ]);
    expect(familyOptionLabel(options.find((item) => item.family === "Var")!)).toContain(
      "вариативный",
    );
    expect(familyOptionLabel(options.find((item) => item.family === "Set")!)).toContain("2 начерт");
  });
});

describe("inferFontFaceDescriptor", () => {
  it("detects bold italic static face", () => {
    expect(inferFontFaceDescriptor("Family-BoldItalic.woff2", "static")).toMatchObject({
      weight: 700,
      style: "italic",
    });
  });
});
