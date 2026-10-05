import { describe, expect, it } from "vitest";
import { photoWallAlbumMosaicGridSx } from "./photoWallAlbumMosaicGrid";

describe("photoWallAlbumMosaicGridSx", () => {
  it("uses only 1x1 and 2x2 formats with large tiles alternating sides", () => {
    expect(photoWallAlbumMosaicGridSx.display).toBe("grid");
    expect(photoWallAlbumMosaicGridSx.gridAutoFlow).toBe("dense");
    expect(photoWallAlbumMosaicGridSx.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell"]).toEqual({
      gridColumn: "span 1",
      gridRow: "span 1",
    });
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell:nth-child(10n + 1)"]).toEqual({
      gridColumn: "1 / span 2",
      gridRow: "span 2",
    });
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell:nth-child(10n + 6)"]).toEqual({
      gridColumn: "2 / span 2",
      gridRow: "span 2",
    });
  });

  it("alternates large tiles left/right on wide containers", () => {
    const wide = photoWallAlbumMosaicGridSx["@container (min-width: 420px)"];
    expect(wide.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    expect(wide["& > .pw-mosaic-cell:nth-child(10n + 1)"]).toEqual({
      gridColumn: "1 / span 2",
      gridRow: "span 2",
    });
    expect(wide["& > .pw-mosaic-cell:nth-child(10n + 6)"]).toEqual({
      gridColumn: "3 / span 2",
      gridRow: "span 2",
    });
  });
});
