import { describe, expect, it } from "vitest";
import { PHOTO_WALL_TILE_ID, PROGRAM_TILE_ID, SPEAKER_TILE_ID } from "../../publicViewContract";
import { buildPlayerTilesOrder, getVisiblePlayerBanners } from "./tiles";

describe("getVisiblePlayerBanners", () => {
  it("filters visible banners", () => {
    expect(
      getVisiblePlayerBanners([
        {
          id: "b1",
          isVisible: true,
          linkUrl: "https://a.com",
          backgroundUrl: "/bg.png",
          size: "2x1",
        },
        {
          id: "b2",
          isVisible: false,
          linkUrl: "https://b.com",
          backgroundUrl: "/bg2.png",
          size: "1x1",
        },
      ]),
    ).toHaveLength(1);
  });
});

describe("buildPlayerTilesOrder", () => {
  it("deduplicates and appends missing system tiles", () => {
    expect(buildPlayerTilesOrder(["speaker_tile", "speaker_tile"], [])).toEqual([
      SPEAKER_TILE_ID,
      PROGRAM_TILE_ID,
      PHOTO_WALL_TILE_ID,
    ]);
  });

  it("moves quiz result tiles to the end", () => {
    expect(
      buildPlayerTilesOrder(
        ["quiz_results_tile:sq-1", SPEAKER_TILE_ID],
        [
          {
            id: "banner-1",
            isVisible: true,
            linkUrl: "https://x.com",
            backgroundUrl: "/b.png",
            size: "full",
          },
        ],
      ),
    ).toEqual([
      SPEAKER_TILE_ID,
      "banner-1",
      PROGRAM_TILE_ID,
      PHOTO_WALL_TILE_ID,
      "quiz_results_tile:sq-1",
    ]);
  });
});
