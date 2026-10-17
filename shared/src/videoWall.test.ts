import { describe, expect, it } from "vitest";
import {
  buildVideoWallAlbumVideos,
  clampVideoWallProjectorFreezeSeconds,
  pickVideoWallProjectorVideos,
  resolveVideoWallTileCoverUrl,
  sanitizeVideoWallItemUrl,
  sanitizeVideoWallItems,
  sanitizeVideoWallPosterUrl,
  videoWallCollageVideoIndices,
  withVideoWallPlaybackContentType,
} from "./videoWall.js";

describe("videoWall", () => {
  it("sanitizes https item urls and rewrites mov content-type", () => {
    expect(sanitizeVideoWallItemUrl("http://example.com/a.mp4")).toBe("");
    expect(sanitizeVideoWallItemUrl("not-a-url")).toBe("");
    expect(
      sanitizeVideoWallItemUrl("https://storage.yandexcloud.net/videos-meyou/caws2026/1.mov"),
    ).toBe(
      "https://storage.yandexcloud.net/videos-meyou/caws2026/1.mov?response-content-type=video%2Fmp4",
    );
    expect(
      withVideoWallPlaybackContentType(
        "https://storage.yandexcloud.net/videos-meyou/caws2026/2.mp4",
      ),
    ).toContain("response-content-type=video%2Fmp4");
  });

  it("sanitizes shared posters and item lists", () => {
    expect(sanitizeVideoWallPosterUrl("https://cdn.example/p.jpg")).toBe(
      "https://cdn.example/p.jpg",
    );
    expect(sanitizeVideoWallPosterUrl("/media/posters/h.jpg")).toBe("/media/posters/h.jpg");
    expect(sanitizeVideoWallPosterUrl("ftp://cdn.example/p.jpg")).toBe("");
    expect(
      sanitizeVideoWallItems([
        { id: "a", url: "https://example.com/h.mp4", title: " Горизонт " },
        { url: "https://example.com/v.mov", title: "" },
        { url: "ftp://bad", title: "x" },
      ]),
    ).toEqual([
      {
        id: "a",
        url: "https://example.com/h.mp4?response-content-type=video%2Fmp4",
        title: "Горизонт",
      },
      expect.objectContaining({
        url: "https://example.com/v.mov?response-content-type=video%2Fmp4",
        title: "Видео 2",
      }),
    ]);
  });

  it("applies orientation poster to album and tile cover", () => {
    const items = sanitizeVideoWallItems([
      { id: "1", url: "https://example.com/1.mp4", title: "A" },
      { id: "2", url: "https://example.com/2.mp4", title: "B" },
    ]);
    const album = buildVideoWallAlbumVideos(items, "horizontal", "https://example.com/h.jpg");
    expect(album).toHaveLength(2);
    expect(album[0]?.posterUrl).toBe("https://example.com/h.jpg");
    expect(album[1]?.posterUrl).toBe("https://example.com/h.jpg");
    expect(
      resolveVideoWallTileCoverUrl(
        "https://example.com/tile.jpg",
        "https://example.com/h.jpg",
        "https://example.com/v.jpg",
      ),
    ).toBe("https://example.com/tile.jpg");
    expect(resolveVideoWallTileCoverUrl("", "", "https://example.com/v.jpg")).toBe(
      "https://example.com/v.jpg",
    );
    expect(videoWallCollageVideoIndices(5)).toHaveLength(3);
  });

  it("picks projector videos by orientation and limit", () => {
    const horizontal = sanitizeVideoWallItems([
      { id: "h1", url: "https://example.com/h1.mp4", title: "H1" },
      { id: "h2", url: "https://example.com/h2.mp4", title: "H2" },
    ]);
    const vertical = sanitizeVideoWallItems([
      { id: "v1", url: "https://example.com/v1.mp4", title: "V1" },
    ]);
    expect(
      pickVideoWallProjectorVideos({
        horizontalItems: horizontal,
        verticalItems: vertical,
        showHorizontal: true,
        showVertical: false,
        maxVideos: 10,
      }),
    ).toHaveLength(2);
    expect(
      pickVideoWallProjectorVideos({
        horizontalItems: horizontal,
        verticalItems: vertical,
        showHorizontal: true,
        showVertical: true,
        maxVideos: 2,
      }),
    ).toHaveLength(2);
  });

  it("clamps projector freeze seconds", () => {
    expect(clampVideoWallProjectorFreezeSeconds(undefined)).toBe(10);
    expect(clampVideoWallProjectorFreezeSeconds(-3)).toBe(0);
    expect(clampVideoWallProjectorFreezeSeconds(12.6)).toBe(13);
    expect(clampVideoWallProjectorFreezeSeconds(9999)).toBe(600);
  });
});
