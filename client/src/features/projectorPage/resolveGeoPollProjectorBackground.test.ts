import { describe, expect, it } from "vitest";
import { resolveGeoPollProjectorBackground } from "./resolveGeoPollProjectorBackground";

describe("resolveGeoPollProjectorBackground", () => {
  const projectorBackground = "#7c5acb";
  const brandImage = "https://cdn.example/projector-bg.png";

  it("uses solid geo color without brand image", () => {
    expect(
      resolveGeoPollProjectorBackground({
        isGeoPollFullBleed: true,
        geoPollScreenBackground: "#111111",
        projectorBackground,
        brandProjectorBackgroundImageUrl: brandImage,
      }),
    ).toEqual({
      backgroundColor: "#111111",
      backgroundImageUrl: undefined,
    });
  });

  it("falls back to projector background + image when transparent", () => {
    expect(
      resolveGeoPollProjectorBackground({
        isGeoPollFullBleed: true,
        geoPollScreenBackground: "transparent",
        projectorBackground,
        brandProjectorBackgroundImageUrl: brandImage,
      }),
    ).toEqual({
      backgroundColor: projectorBackground,
      backgroundImageUrl: brandImage,
    });
  });

  it("ignores geo screen setting when not geo full-bleed", () => {
    expect(
      resolveGeoPollProjectorBackground({
        isGeoPollFullBleed: false,
        geoPollScreenBackground: "#00ff00",
        projectorBackground,
        brandProjectorBackgroundImageUrl: brandImage,
      }),
    ).toEqual({
      backgroundColor: projectorBackground,
      backgroundImageUrl: brandImage,
    });
  });

  it("allows transparent with no brand image", () => {
    expect(
      resolveGeoPollProjectorBackground({
        isGeoPollFullBleed: true,
        geoPollScreenBackground: "transparent",
        projectorBackground,
        brandProjectorBackgroundImageUrl: undefined,
      }),
    ).toEqual({
      backgroundColor: projectorBackground,
      backgroundImageUrl: undefined,
    });
  });
});
