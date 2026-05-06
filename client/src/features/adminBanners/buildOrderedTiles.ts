import type { PublicBanner } from "../../publicViewContract";
import { PROGRAM_TILE_ID, SPEAKER_TILE_ID } from "../../publicViewContract";
import type { OrderedTile } from "../../components/admin/banners/types";

export function buildOrderedTiles(
  tilesOrder: string[],
  banners: PublicBanner[],
  speakerTileText: string,
  speakerTileBackgroundColor: string,
  speakerTileTextColor: string,
  programTileText: string,
  programTileBackgroundColor: string,
  programTileTextColor: string,
  programTileLinkUrl: string,
): OrderedTile[] {
  return [...tilesOrder, ...banners.map((b) => b.id)]
    .map((id) => {
      if (id === SPEAKER_TILE_ID) {
        return {
          id,
          kind: "speaker" as const,
          label: "Плитка «Вопросы спикерам»",
          previewText: speakerTileText,
          backgroundColor: speakerTileBackgroundColor,
          textColor: speakerTileTextColor,
        };
      }
      if (id === PROGRAM_TILE_ID) {
        return {
          id,
          kind: "program" as const,
          label: "Кнопка «Программа»",
          previewText: programTileText,
          backgroundColor: programTileBackgroundColor,
          textColor: programTileTextColor,
          linkUrl: programTileLinkUrl,
        };
      }
      const banner = banners.find((x) => x.id === id);
      if (!banner) return null;
      return {
        id,
        kind: "banner" as const,
        label: `Баннер: ${banner.linkUrl}`,
        previewUrl: banner.backgroundUrl,
        size: banner.size,
        banner,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((tile, idx, arr) => arr.findIndex((x) => x.id === tile.id) === idx);
}
