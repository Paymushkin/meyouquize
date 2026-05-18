import {
  isQuizResultsTileId,
  parseQuizResultsSubQuizIdFromTileId,
  PROGRAM_TILE_ID,
  QUIZ_RESULTS_TILE_ID,
  SPEAKER_TILE_ID,
} from "../../publicViewContract";
import type { PublicBanner } from "../../publicViewContract";
import type { OrderedTile } from "../../components/admin/banners/types";
import { resolveQuizResultsTileTitle } from "../quizPlay/playerQuizResults";

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
  quizResultsCaption: string,
  playerQuizResultsSubQuizIds: string[],
  subQuizzesForReport: Array<{ id: string; title: string }>,
  brandPrimaryColor: string,
  playerVoteOptionTextColor: string,
): OrderedTile[] {
  const legacyEffectiveId =
    playerQuizResultsSubQuizIds[0]?.trim() || subQuizzesForReport[0]?.id || "";

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
      if (isQuizResultsTileId(id)) {
        const sqId = parseQuizResultsSubQuizIdFromTileId(id) ?? legacyEffectiveId;
        const sqTitle = subQuizzesForReport.find((s) => s.id === sqId)?.title?.trim();
        return {
          id,
          kind: "quiz_results" as const,
          label: sqTitle ? `Отчёт: ${sqTitle}` : "Плитка «Мой квиз» (1×1)",
          title: resolveQuizResultsTileTitle(quizResultsCaption, subQuizzesForReport, sqId),
          brandPrimaryColor,
          brandTextColor: playerVoteOptionTextColor,
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
