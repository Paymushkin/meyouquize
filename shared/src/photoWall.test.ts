import { describe, expect, it } from "vitest";
import {
  buildPhotoWallAlbumPhotos,
  buildPhotoWallImageUrl,
  buildPhotoWallWaterfallColumnPhotos,
  clampPhotoWallImageCount,
  photoWallColumnPhotoIndices,
  photoWallPickInsertPhotoIndex,
  photoWallSlotPhotoIndex,
  photoWallCollagePhotoIndices,
  resolvePhotoWallCollageLayout,
  photoWallTileAspectRatio,
  PHOTO_WALL_COLLAGE_PHOTO_COUNT,
  resolvePhotoWallColumnCount,
  sanitizePhotoWallBaseUrl,
} from "./photoWall.js";

describe("photoWall", () => {
  it("normalizes base URL with trailing slash and https only", () => {
    expect(sanitizePhotoWallBaseUrl("https://storage.yandexcloud.net/bucket/event/photos")).toBe(
      "https://storage.yandexcloud.net/bucket/event/photos/",
    );
    expect(sanitizePhotoWallBaseUrl("http://example.com/a/")).toBe("");
    expect(sanitizePhotoWallBaseUrl("not-a-url")).toBe("");
  });

  it("enforces allowed hosts when configured", () => {
    const allowed = ["storage.yandexcloud.net"];
    expect(
      sanitizePhotoWallBaseUrl("https://storage.yandexcloud.net/b/a/", { allowedHosts: allowed }),
    ).toBe("https://storage.yandexcloud.net/b/a/");
    expect(sanitizePhotoWallBaseUrl("https://evil.example/a/", { allowedHosts: allowed })).toBe("");
  });

  it("builds numbered image URLs", () => {
    const base = "https://storage.yandexcloud.net/bucket/wall/";
    expect(buildPhotoWallImageUrl(base, 1, "jpeg")).toBe(`${base}1.jpeg`);
    expect(buildPhotoWallImageUrl(base, 12, "png")).toBe(`${base}12.png`);
  });

  it("builds album photos up to max count", () => {
    const photos = buildPhotoWallAlbumPhotos({
      baseUrl: "https://storage.yandexcloud.net/bucket/wall/",
      count: 3,
      ext: "jpg",
    });
    expect(photos).toHaveLength(3);
    expect(photos[0]?.src).toContain("/1.jpg");
    expect(photos[2]?.index).toBe(3);
    expect(clampPhotoWallImageCount(9999)).toBe(200);
  });

  it("resolves waterfall column count", () => {
    expect(resolvePhotoWallColumnCount(4, 800)).toBe(4);
    expect(resolvePhotoWallColumnCount(0, 1500)).toBe(6);
    expect(resolvePhotoWallColumnCount(0, 900)).toBe(4);
  });

  it("distributes photos across waterfall columns without overlap", () => {
    const photos = buildPhotoWallAlbumPhotos({
      baseUrl: "https://storage.yandexcloud.net/bucket/wall/",
      count: 6,
    });
    const col0 = buildPhotoWallWaterfallColumnPhotos(photos, 0, 3, 3);
    const col1 = buildPhotoWallWaterfallColumnPhotos(photos, 1, 3, 3);
    const col2 = buildPhotoWallWaterfallColumnPhotos(photos, 2, 3, 3);
    expect(col0.map((p) => p.index)).toEqual([1, 4, 1]);
    expect(col1.map((p) => p.index)).toEqual([2, 5, 2]);
    expect(col2.map((p) => p.index)).toEqual([3, 6, 3]);
    const visibleAtSlot0 = [
      photoWallSlotPhotoIndex(6, 0, 3, 0, 0),
      photoWallSlotPhotoIndex(6, 1, 3, 0, 0),
      photoWallSlotPhotoIndex(6, 2, 3, 0, 0),
    ];
    expect(new Set(visibleAtSlot0).size).toBe(3);
    expect(photoWallTileAspectRatio({ width: 1600, height: 1200 })).toBe("1600 / 1200");
  });

  it("picks insert photo avoiding neighbors in column pool", () => {
    expect(photoWallColumnPhotoIndices(6, 0, 3)).toEqual([0, 3]);
    expect(photoWallPickInsertPhotoIndex(6, 0, 3, [0], 0)).toBe(3);
    expect(photoWallPickInsertPhotoIndex(6, 0, 3, [0, 3], 0)).toBeNull();
    expect(photoWallPickInsertPhotoIndex(6, 1, 3, [1], 0)).toBe(4);
  });

  it("picks evenly spaced photos for player collage", () => {
    expect(photoWallCollagePhotoIndices(0)).toEqual([]);
    expect(photoWallCollagePhotoIndices(1)).toEqual([0]);
    expect(photoWallCollagePhotoIndices(8)).toEqual([0, 4, 7]);
    expect(photoWallCollagePhotoIndices(8, PHOTO_WALL_COLLAGE_PHOTO_COUNT)).toHaveLength(3);
  });

  it("resolves collage grid layout for tile preview", () => {
    expect(resolvePhotoWallCollageLayout(0).kind).toBe("empty");
    expect(resolvePhotoWallCollageLayout(1)).toEqual({
      kind: "single",
      columns: 1,
      rows: 1,
      cells: [{ photoIndex: 0, column: 1, row: 1, rowSpan: 1 }],
    });
    expect(resolvePhotoWallCollageLayout(2)).toEqual({
      kind: "pair",
      columns: 2,
      rows: 1,
      cells: [
        { photoIndex: 0, column: 1, row: 1, rowSpan: 1 },
        { photoIndex: 1, column: 2, row: 1, rowSpan: 1 },
      ],
    });
    expect(resolvePhotoWallCollageLayout(3)).toEqual({
      kind: "mosaic",
      columns: 2,
      rows: 2,
      cells: [
        { photoIndex: 0, column: 1, row: 1, rowSpan: 2 },
        { photoIndex: 1, column: 2, row: 1, rowSpan: 1 },
        { photoIndex: 2, column: 2, row: 2, rowSpan: 1 },
      ],
    });
    expect(resolvePhotoWallCollageLayout(99).kind).toBe("mosaic");
  });
});
