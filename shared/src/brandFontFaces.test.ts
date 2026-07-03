import { describe, expect, it } from "vitest";
import {
  filterMediaBrandFontUrls,
  inferCssFontFormat,
  isBuiltinBrandFontFamily,
  isMediaBrandFontUrl,
  sanitizeBrandFontUrls,
} from "./brandFontFaces.js";

describe("brandFontFaces", () => {
  it("sanitizes unique urls with max length", () => {
    expect(sanitizeBrandFontUrls([" /media/a.woff2 ", "/media/a.woff2", "/media/b.woff2"])).toEqual(
      ["/media/a.woff2", "/media/b.woff2"],
    );
  });

  it("detects builtin font families", () => {
    expect(isBuiltinBrandFontFamily("Roboto, Arial, sans-serif")).toBe(true);
    expect(isBuiltinBrandFontFamily('"Alfa", Arial, sans-serif')).toBe(false);
  });

  it("filters only media catalog urls", () => {
    expect(
      filterMediaBrandFontUrls([
        "/media/a.woff2",
        "/fonts/roboto/Roboto.ttf",
        "http://192.168.0.1/media/b.woff2",
      ]),
    ).toEqual(["/media/a.woff2", "http://192.168.0.1/media/b.woff2"]);
  });

  it("infers css font format from extension", () => {
    expect(inferCssFontFormat("/fonts/roboto/Roboto.ttf")).toBe("truetype");
    expect(inferCssFontFormat("/media/a.woff2", "Family-Bold.woff2")).toBe("woff2");
  });

  it("detects media urls", () => {
    expect(isMediaBrandFontUrl("/media/x.woff2")).toBe(true);
    expect(isMediaBrandFontUrl("/fonts/jost/Jost.ttf")).toBe(false);
  });
});
