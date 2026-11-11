import { describe, expect, it } from "vitest";
import {
  buildPhotoWallAlbumPhotos,
  buildPhotoWallImageUrl,
  buildPhotoWallWaterfallColumnPhotos,
  clampPhotoWallImageCount,
  photoWallColumnPhotoIndices,
  photoWallPickInsertPhotoIndex,
  photoWallPickRemovalTileIndex,
  photoWallSlotPhotoIndex,
  photoWallCollagePhotoIndices,
  photoWallWaterfallScrollSpeedPxPerSec,
  resolvePhotoWallCollageLayout,
  photoWallTileAspectRatio,
  PHOTO_WALL_COLLAGE_PHOTO_COUNT,
  PHOTO_WALL_SCROLL_SPEED_PX_PER_SEC,
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
    // Новые файлы (больший index) идут первыми в колонке.
    expect(col0.map((p) => p.index)).toEqual([4, 1, 4]);
    expect(col1.map((p) => p.index)).toEqual([5, 2, 5]);
    expect(col2.map((p) => p.index)).toEqual([6, 3, 6]);
    const visibleAtSlot0 = [
      photoWallSlotPhotoIndex(6, 0, 3, 0, 0),
      photoWallSlotPhotoIndex(6, 1, 3, 0, 0),
      photoWallSlotPhotoIndex(6, 2, 3, 0, 0),
    ];
    expect(new Set(visibleAtSlot0).size).toBe(3);
    expect(visibleAtSlot0).toEqual([3, 4, 5]);
    expect(photoWallTileAspectRatio({ width: 1600, height: 1200 })).toBe("1600 / 1200");
  });

  it("picks insert photo avoiding neighbors in column pool", () => {
    expect(photoWallColumnPhotoIndices(6, 0, 3)).toEqual([3, 0]);
    expect(photoWallPickInsertPhotoIndex(6, 0, 3, [0], 0)).toBe(3);
    expect(photoWallPickInsertPhotoIndex(6, 0, 3, [0, 3], 0)).toBeNull();
    expect(photoWallPickInsertPhotoIndex(6, 1, 3, [1], 0)).toBe(4);
  });

  it("picks the last photos for player collage", () => {
    expect(photoWallCollagePhotoIndices(0)).toEqual([]);
    expect(photoWallCollagePhotoIndices(1)).toEqual([0]);
    expect(photoWallCollagePhotoIndices(2)).toEqual([0, 1]);
    expect(photoWallCollagePhotoIndices(8)).toEqual([5, 6, 7]);
    expect(photoWallCollagePhotoIndices(8, PHOTO_WALL_COLLAGE_PHOTO_COUNT)).toHaveLength(3);
  });

  it("keeps waterfall scroll speed stable across columns", () => {
    expect(photoWallWaterfallScrollSpeedPxPerSec(0, 4)).toBe(PHOTO_WALL_SCROLL_SPEED_PX_PER_SEC);
    expect(photoWallWaterfallScrollSpeedPxPerSec(2, 4)).toBe(
      PHOTO_WALL_SCROLL_SPEED_PX_PER_SEC + 10,
    );
  });

  it("picks a removal tile away from insert and center zone", () => {
    expect(
      photoWallPickRemovalTileIndex({
        tilesLength: 1,
        insertAt: 1,
        centerLogicalIndices: [0],
      }),
    ).toBeNull();

    const removed = photoWallPickRemovalTileIndex({
      tilesLength: 8,
      insertAt: 3,
      centerLogicalIndices: [2, 3, 4],
    });
    expect(removed).not.toBeNull();
    expect([2, 3]).not.toContain(removed);
    expect([2, 3, 4]).not.toContain(removed);
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
