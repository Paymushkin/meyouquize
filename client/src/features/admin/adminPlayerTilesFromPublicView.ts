import type { PublicViewPayload } from "@meyouquize/shared";
import { buildPlayerTilesOrder } from "../quizPlay/tiles";
import type { PublicBanner } from "../../publicViewContract";

type TileSetters = {
  setShowEventTitleOnPlayer: (value: boolean) => void;
  setSpeakerTileText: (value: string) => void;
  setSpeakerTileBackgroundColor: (value: string) => void;
  setSpeakerTileTextColor: (value: string) => void;
  setSpeakerTileVisible: (value: boolean) => void;
  setProgramTileText: (value: string) => void;
  setProgramTileBackgroundColor: (value: string) => void;
  setProgramTileTextColor: (value: string) => void;
  setProgramTileLinkUrl: (value: string) => void;
  setProgramTileVisible: (value: boolean) => void;
  setPlayerQuizResultsTileText: (value: string) => void;
  setPlayerQuizResultsTileBackgroundColor: (value: string) => void;
  setPlayerQuizResultsTileTextColor: (value: string) => void;
  setPlayerQuizResultsSubQuizId: (value: string) => void;
  setPlayerQuizResultsSubQuizIds: (value: string[]) => void;
  setPlayerQuizResultsTileVisible: (value: boolean) => void;
  setPlayerTilesOrder: (value: string[]) => void;
};

function getStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter((item): item is string => typeof item === "string");
  return out.length > 0 ? out : [];
}

/** Синхронизация player-tile полей из results:public:view в state админки. */
export function applyAdminPlayerTilesFromPublicView(
  pv: PublicViewPayload,
  nextBanners: PublicBanner[],
  setters: TileSetters,
) {
  if (typeof pv.showEventTitleOnPlayer === "boolean") {
    setters.setShowEventTitleOnPlayer(pv.showEventTitleOnPlayer);
  }
  if (typeof pv.speakerTileText === "string") {
    setters.setSpeakerTileText(pv.speakerTileText);
  }
  if (typeof pv.speakerTileBackgroundColor === "string") {
    setters.setSpeakerTileBackgroundColor(pv.speakerTileBackgroundColor);
  }
  if (typeof pv.speakerTileTextColor === "string") {
    setters.setSpeakerTileTextColor(pv.speakerTileTextColor);
  }
  if (typeof pv.speakerTileVisible === "boolean") {
    setters.setSpeakerTileVisible(pv.speakerTileVisible);
  }
  if (typeof pv.programTileText === "string") {
    setters.setProgramTileText(pv.programTileText);
  }
  if (typeof pv.programTileBackgroundColor === "string") {
    setters.setProgramTileBackgroundColor(pv.programTileBackgroundColor);
  }
  if (typeof pv.programTileTextColor === "string") {
    setters.setProgramTileTextColor(pv.programTileTextColor);
  }
  if (typeof pv.programTileLinkUrl === "string") {
    setters.setProgramTileLinkUrl(pv.programTileLinkUrl);
  }
  if (typeof pv.programTileVisible === "boolean") {
    setters.setProgramTileVisible(pv.programTileVisible);
  }
  if (typeof pv.playerQuizResultsTileText === "string") {
    setters.setPlayerQuizResultsTileText(pv.playerQuizResultsTileText);
  }
  if (typeof pv.playerQuizResultsTileBackgroundColor === "string") {
    setters.setPlayerQuizResultsTileBackgroundColor(pv.playerQuizResultsTileBackgroundColor);
  }
  if (typeof pv.playerQuizResultsTileTextColor === "string") {
    setters.setPlayerQuizResultsTileTextColor(pv.playerQuizResultsTileTextColor);
  }
  if (typeof pv.playerQuizResultsSubQuizId === "string") {
    setters.setPlayerQuizResultsSubQuizId(pv.playerQuizResultsSubQuizId);
  }
  if (Array.isArray(pv.playerQuizResultsSubQuizIds)) {
    setters.setPlayerQuizResultsSubQuizIds(
      pv.playerQuizResultsSubQuizIds.filter((x): x is string => typeof x === "string"),
    );
  } else if (pv.playerQuizResultsTileVisible) {
    const legacy =
      typeof pv.playerQuizResultsSubQuizId === "string" ? pv.playerQuizResultsSubQuizId.trim() : "";
    if (legacy) setters.setPlayerQuizResultsSubQuizIds([legacy]);
  }
  if (typeof pv.playerQuizResultsTileVisible === "boolean") {
    setters.setPlayerQuizResultsTileVisible(pv.playerQuizResultsTileVisible);
  }
  const nextTilesOrder = getStringArrayOrNull(pv.playerTilesOrder) ?? [];
  setters.setPlayerTilesOrder(buildPlayerTilesOrder(nextTilesOrder, nextBanners));
}
