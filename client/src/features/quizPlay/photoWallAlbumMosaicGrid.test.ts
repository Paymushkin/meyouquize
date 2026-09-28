import { describe, expect, it } from "vitest";
import { photoWallAlbumMosaicGridSx } from "./photoWallAlbumMosaicGrid";

describe("photoWallAlbumMosaicGridSx", () => {
  it("uses dense auto-flow with a 3-column mosaic rhythm", () => {
    expect(photoWallAlbumMosaicGridSx.display).toBe("grid");
    expect(photoWallAlbumMosaicGridSx.gridAutoFlow).toBe("dense");
    expect(photoWallAlbumMosaicGridSx.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell:nth-child(7n + 1)"]).toEqual({
      gridColumn: "span 2",
      gridRow: "span 2",
    });
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell:nth-child(7n + 3)"]).toEqual({
      gridRow: "span 2",
    });
    expect(photoWallAlbumMosaicGridSx["& > .pw-mosaic-cell:nth-child(7n + 6)"]).toEqual({
      gridColumn: "span 2",
    });
  });

  it("switches to a 4-column rhythm from 420px container width", () => {
    const wide = photoWallAlbumMosaicGridSx["@container (min-width: 420px)"];
    expect(wide.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    expect(wide["& > .pw-mosaic-cell:nth-child(8n + 1)"]).toEqual({
      gridColumn: "span 2",
      gridRow: "span 2",
    });
    expect(wide["& > .pw-mosaic-cell:nth-child(8n + 4)"]).toEqual({
      gridRow: "span 2",
    });
    expect(wide["& > .pw-mosaic-cell:nth-child(8n + 6)"]).toEqual({
      gridColumn: "span 2",
    });
    expect(wide["& > .pw-mosaic-cell:nth-child(8n + 7)"]).toEqual({
      gridRow: "span 2",
    });
  });
});
