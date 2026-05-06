import { describe, expect, it } from "vitest";
import { SPEAKER_TILE_ID } from "@meyouquize/shared";
import { buildOrderedTiles } from "./buildOrderedTiles";

describe("buildOrderedTiles", () => {
  const bannerA = {
    id: "b1",
    linkUrl: "https://a.test",
    backgroundUrl: "https://a.test/a.png",
    size: "1x1" as const,
    isVisible: true,
  };
  const bannerB = {
    id: "b2",
    linkUrl: "https://b.test",
    backgroundUrl: "https://b.test/b.png",
    size: "2x1" as const,
    isVisible: false,
  };

  it("keeps explicit mixed order for banners and speaker tile", () => {
    const rows = buildOrderedTiles(
      [bannerB.id, SPEAKER_TILE_ID, bannerA.id],
      [bannerA, bannerB],
      "Вопросы спикерам",
      "#1976d2",
      "#ffffff",
      "Программа",
      "#6a1b9a",
      "#ffffff",
      "https://example.com/program",
    );
    expect(rows.map((x) => x.id)).toEqual([bannerB.id, SPEAKER_TILE_ID, bannerA.id]);
  });

  it("appends missing banners and deduplicates ids", () => {
    const rows = buildOrderedTiles(
      [SPEAKER_TILE_ID, bannerA.id, bannerA.id],
      [bannerA, bannerB],
      "",
      "#1976d2",
      "#ffffff",
      "Программа",
      "#6a1b9a",
      "#ffffff",
      "",
    );
    expect(rows.map((x) => x.id)).toEqual([SPEAKER_TILE_ID, bannerA.id, bannerB.id]);
  });
});
