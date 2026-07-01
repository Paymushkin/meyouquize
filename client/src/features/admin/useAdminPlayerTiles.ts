import {
  PROGRAM_TILE_ID,
  SPEAKER_TILE_ID,
  quizResultsTileIdForSubQuiz,
  QUIZ_RESULTS_TILE_ID,
  withQuizResultsTileLast,
  type PublicViewPayload,
} from "@meyouquize/shared";
import { useCallback, useMemo, useState } from "react";
import { applyAdminPlayerTilesFromPublicView } from "./adminPlayerTilesFromPublicView";
import { bannerClickCountsFromStats, getBannerClickStatsOrNull } from "./adminBannerClickStats";
import { buildPlayerTilesOrder } from "../quizPlay/tiles";
import type { PublicBanner, PublicBannerClickStats } from "../../publicViewContract";
import { socket } from "../../socket";

type EmitPatch = (patch: Record<string, unknown>) => void;

type Params = {
  quizId: string;
  emitPublicViewPatch: EmitPatch;
  setMessage: (message: string) => void;
  setSpeakerQuestionsEnabled: (enabled: boolean) => void;
  subQuizzesForReport: Array<{ id: string; title: string }>;
};

export function useAdminPlayerTiles({
  quizId,
  emitPublicViewPatch,
  setMessage,
  setSpeakerQuestionsEnabled,
  subQuizzesForReport,
}: Params) {
  const [showEventTitleOnPlayer, setShowEventTitleOnPlayer] = useState(true);
  const [playerBanners, setPlayerBanners] = useState<PublicBanner[]>([]);
  const [speakerTileText, setSpeakerTileText] = useState("Вопросы спикерам");
  const [speakerTileBackgroundColor, setSpeakerTileBackgroundColor] = useState("#1976d2");
  const [speakerTileTextColor, setSpeakerTileTextColor] = useState("#ffffff");
  const [speakerTileVisible, setSpeakerTileVisible] = useState(false);
  const [programTileText, setProgramTileText] = useState("Программа");
  const [programTileBackgroundColor, setProgramTileBackgroundColor] = useState("#6a1b9a");
  const [programTileTextColor, setProgramTileTextColor] = useState("#ffffff");
  const [programTileLinkUrl, setProgramTileLinkUrl] = useState("");
  const [programTileVisible, setProgramTileVisible] = useState(false);
  const [playerQuizResultsTileText, setPlayerQuizResultsTileText] = useState("Мой квиз");
  const [playerQuizResultsTileBackgroundColor, setPlayerQuizResultsTileBackgroundColor] =
    useState("#2e7d32");
  const [playerQuizResultsTileTextColor, setPlayerQuizResultsTileTextColor] = useState("#ffffff");
  const [playerQuizResultsSubQuizId, setPlayerQuizResultsSubQuizId] = useState("");
  const [playerQuizResultsSubQuizIds, setPlayerQuizResultsSubQuizIds] = useState<string[]>([]);
  const [playerQuizResultsTileVisible, setPlayerQuizResultsTileVisible] = useState(false);
  const [playerTilesOrder, setPlayerTilesOrder] = useState<string[]>([
    SPEAKER_TILE_ID,
    PROGRAM_TILE_ID,
  ]);
  const [playerBannerClickStats, setPlayerBannerClickStats] = useState<PublicBannerClickStats[]>(
    [],
  );

  const refreshQuizState = useCallback(() => {
    if (!quizId) return;
    socket.emit("quiz:state:refresh", { quizId });
  }, [quizId]);

  const applyBannerClickStatsFromPublicView = useCallback((payload: PublicViewPayload) => {
    const stats = getBannerClickStatsOrNull(
      (payload as { playerBannerClickStats?: unknown }).playerBannerClickStats,
    );
    if (stats) {
      setPlayerBannerClickStats(stats);
    }
  }, []);

  const applyFromPublicView = useCallback(
    (pv: PublicViewPayload, nextBanners: PublicBanner[]) => {
      setPlayerBanners(nextBanners);
      applyAdminPlayerTilesFromPublicView(pv, nextBanners, {
        setShowEventTitleOnPlayer,
        setSpeakerTileText,
        setSpeakerTileBackgroundColor,
        setSpeakerTileTextColor,
        setSpeakerTileVisible,
        setProgramTileText,
        setProgramTileBackgroundColor,
        setProgramTileTextColor,
        setProgramTileLinkUrl,
        setProgramTileVisible,
        setPlayerQuizResultsTileText,
        setPlayerQuizResultsTileBackgroundColor,
        setPlayerQuizResultsTileTextColor,
        setPlayerQuizResultsSubQuizId,
        setPlayerQuizResultsSubQuizIds,
        setPlayerQuizResultsTileVisible,
        setPlayerTilesOrder,
      });
      applyBannerClickStatsFromPublicView(pv);
    },
    [applyBannerClickStatsFromPublicView],
  );

  const bannerClickCounts = useMemo(
    () => bannerClickCountsFromStats(playerBannerClickStats),
    [playerBannerClickStats],
  );

  const applyPrunedPlayerUi = useCallback(
    (pruned: {
      playerQuizResultsSubQuizIds: string[];
      playerQuizResultsSubQuizId: string;
      playerQuizResultsTileVisible: boolean;
      playerTilesOrder: string[];
    }) => {
      const nextTilesOrder = buildPlayerTilesOrder(pruned.playerTilesOrder, playerBanners);
      setPlayerQuizResultsSubQuizIds(pruned.playerQuizResultsSubQuizIds);
      setPlayerQuizResultsSubQuizId(pruned.playerQuizResultsSubQuizId);
      setPlayerQuizResultsTileVisible(pruned.playerQuizResultsTileVisible);
      setPlayerTilesOrder(nextTilesOrder);
      return nextTilesOrder;
    },
    [playerBanners],
  );

  const createPlayerBanner = useCallback(
    (linkUrl: string, backgroundUrl: string, size: "2x1" | "1x1" | "full") => {
      if (!quizId) return;
      const next: PublicBanner[] = [
        ...playerBanners,
        {
          id: globalThis.crypto?.randomUUID?.() ?? `banner_${Date.now()}`,
          linkUrl,
          backgroundUrl,
          size,
          isVisible: false,
        },
      ];
      const baseOrder = buildPlayerTilesOrder(playerTilesOrder, playerBanners);
      const nextOrderRaw = [
        ...baseOrder.filter((x) => x !== SPEAKER_TILE_ID),
        next[next.length - 1]!.id,
        SPEAKER_TILE_ID,
      ];
      const nextOrder = withQuizResultsTileLast(nextOrderRaw);
      setPlayerBanners(next);
      setPlayerTilesOrder(nextOrder);
      emitPublicViewPatch({ playerBanners: next, playerTilesOrder: nextOrder });
      refreshQuizState();
      setMessage("Баннер создан");
    },
    [emitPublicViewPatch, playerBanners, playerTilesOrder, quizId, refreshQuizState, setMessage],
  );

  const togglePlayerBannerVisible = useCallback(
    (bannerId: string, next: boolean) => {
      if (!quizId) return;
      const updated = playerBanners.map((item) =>
        item.id === bannerId ? { ...item, isVisible: next } : item,
      );
      setPlayerBanners(updated);
      emitPublicViewPatch({ playerBanners: updated });
      refreshQuizState();
      setMessage(next ? "Баннер выведен на экран пользователя" : "Баннер скрыт у пользователя");
    },
    [emitPublicViewPatch, playerBanners, quizId, refreshQuizState, setMessage],
  );

  const deletePlayerBanner = useCallback(
    (bannerId: string) => {
      if (!quizId) return;
      const next = playerBanners.filter((item) => item.id !== bannerId);
      const nextOrder = buildPlayerTilesOrder(playerTilesOrder, next).filter(
        (id) => id !== bannerId,
      );
      setPlayerBanners(next);
      setPlayerTilesOrder(nextOrder);
      emitPublicViewPatch({ playerBanners: next, playerTilesOrder: nextOrder });
      refreshQuizState();
      setMessage("Баннер удален");
    },
    [emitPublicViewPatch, playerBanners, playerTilesOrder, quizId, refreshQuizState, setMessage],
  );

  const updatePlayerBanner = useCallback(
    (id: string, linkUrl: string, backgroundUrl: string, size: "2x1" | "1x1" | "full") => {
      if (!quizId) return;
      const next = playerBanners.map((item) =>
        item.id === id ? { ...item, linkUrl, backgroundUrl, size } : item,
      );
      setPlayerBanners(next);
      emitPublicViewPatch({ playerBanners: next });
      refreshQuizState();
      setMessage("Баннер обновлен");
    },
    [emitPublicViewPatch, playerBanners, quizId, refreshQuizState, setMessage],
  );

  const saveSpeakerTile = useCallback(
    (text: string, backgroundColor: string, textColor: string) => {
      if (!quizId) return;
      const nextText = text || "Вопросы спикерам";
      const nextBg = backgroundColor || "#1976d2";
      const nextColor = textColor || "#ffffff";
      setSpeakerTileText(nextText);
      setSpeakerTileBackgroundColor(nextBg);
      setSpeakerTileTextColor(nextColor);
      if (speakerTileVisible) {
        setSpeakerQuestionsEnabled(true);
      }
      emitPublicViewPatch({
        speakerTileText: nextText,
        speakerTileBackgroundColor: nextBg,
        speakerTileTextColor: nextColor,
        speakerTileVisible,
        ...(speakerTileVisible ? { speakerQuestionsEnabled: true } : {}),
      });
      setMessage("Плитка «Вопросы спикерам» обновлена");
    },
    [emitPublicViewPatch, quizId, setMessage, setSpeakerQuestionsEnabled, speakerTileVisible],
  );

  const toggleSpeakerTileVisible = useCallback(
    (next: boolean, payload: { text: string; backgroundColor: string; textColor: string }) => {
      if (!quizId) return;
      const nextText = payload.text.trim() || "Вопросы спикерам";
      const nextBg = payload.backgroundColor.trim() || "#1976d2";
      const nextTextColor = payload.textColor.trim() || "#ffffff";
      setSpeakerTileText(nextText);
      setSpeakerTileBackgroundColor(nextBg);
      setSpeakerTileTextColor(nextTextColor);
      setSpeakerTileVisible(next);
      setSpeakerQuestionsEnabled(next);
      emitPublicViewPatch({
        speakerTileText: nextText,
        speakerTileBackgroundColor: nextBg,
        speakerTileTextColor: nextTextColor,
        speakerTileVisible: next,
        speakerQuestionsEnabled: next,
      });
      refreshQuizState();
      setMessage(
        next
          ? "Плитка «Вопросы спикерам» выведена пользователю"
          : "Плитка «Вопросы спикерам» скрыта у пользователя",
      );
    },
    [emitPublicViewPatch, quizId, refreshQuizState, setMessage, setSpeakerQuestionsEnabled],
  );

  const saveProgramTile = useCallback(
    (text: string, backgroundColor: string, textColor: string, linkUrl: string) => {
      if (!quizId) return;
      const nextText = text || "Программа";
      const nextBg = backgroundColor || "#6a1b9a";
      const nextColor = textColor || "#ffffff";
      const nextLink = linkUrl || "";
      setProgramTileText(nextText);
      setProgramTileBackgroundColor(nextBg);
      setProgramTileTextColor(nextColor);
      setProgramTileLinkUrl(nextLink);
      emitPublicViewPatch({
        programTileText: nextText,
        programTileBackgroundColor: nextBg,
        programTileTextColor: nextColor,
        programTileLinkUrl: nextLink,
        programTileVisible,
      });
      refreshQuizState();
      setMessage("Кнопка «Программа» обновлена");
    },
    [emitPublicViewPatch, programTileVisible, quizId, refreshQuizState, setMessage],
  );

  const toggleProgramTileVisible = useCallback(
    (
      next: boolean,
      payload: { text: string; backgroundColor: string; textColor: string; linkUrl: string },
    ) => {
      if (!quizId) return;
      const nextText = payload.text.trim() || "Программа";
      const nextBg = payload.backgroundColor.trim() || "#6a1b9a";
      const nextTextColor = payload.textColor.trim() || "#ffffff";
      const nextLink = payload.linkUrl.trim();
      setProgramTileText(nextText);
      setProgramTileBackgroundColor(nextBg);
      setProgramTileTextColor(nextTextColor);
      setProgramTileLinkUrl(nextLink);
      setProgramTileVisible(next);
      emitPublicViewPatch({
        programTileText: nextText,
        programTileBackgroundColor: nextBg,
        programTileTextColor: nextTextColor,
        programTileLinkUrl: nextLink,
        programTileVisible: next,
      });
      refreshQuizState();
      setMessage(
        next
          ? "Кнопка «Программа» выведена пользователю"
          : "Кнопка «Программа» скрыта у пользователя",
      );
    },
    [emitPublicViewPatch, quizId, refreshQuizState, setMessage],
  );

  const togglePlayerQuizReportForSubQuiz = useCallback(
    (subQuizId: string, next: boolean, caption: string) => {
      if (!quizId || !subQuizId.trim()) return;
      const sqId = subQuizId.trim();
      const tileId = quizResultsTileIdForSubQuiz(sqId);
      const nextText = caption.trim() || "Мой квиз";

      let nextIds = [...playerQuizResultsSubQuizIds];
      const nextOrder = playerTilesOrder.filter(
        (id) => id !== QUIZ_RESULTS_TILE_ID && id !== tileId,
      );

      if (next) {
        if (!nextIds.includes(sqId)) nextIds.push(sqId);
        if (!nextOrder.includes(tileId)) nextOrder.push(tileId);
      } else {
        nextIds = nextIds.filter((id) => id !== sqId);
      }

      const normalizedOrder = buildPlayerTilesOrder(nextOrder, playerBanners);
      setPlayerQuizResultsTileText(nextText);
      setPlayerQuizResultsSubQuizIds(nextIds);
      setPlayerQuizResultsSubQuizId(nextIds[0] ?? "");
      setPlayerQuizResultsTileVisible(nextIds.length > 0);
      setPlayerTilesOrder(normalizedOrder);

      emitPublicViewPatch({
        playerQuizResultsTileText: nextText,
        playerQuizResultsSubQuizIds: nextIds,
        playerQuizResultsSubQuizId: nextIds[0] ?? "",
        playerQuizResultsTileVisible: nextIds.length > 0,
        playerTilesOrder: normalizedOrder,
      });
      refreshQuizState();
      const sqTitle = subQuizzesForReport.find((s) => s.id === sqId)?.title?.trim() || "квиз";
      setMessage(
        next ? `Отчёт «${sqTitle}» выведен игрокам` : `Отчёт «${sqTitle}» скрыт у игроков`,
      );
    },
    [
      emitPublicViewPatch,
      playerBanners,
      playerQuizResultsSubQuizIds,
      playerTilesOrder,
      quizId,
      refreshQuizState,
      setMessage,
      subQuizzesForReport,
    ],
  );

  const moveTile = useCallback(
    (id: string, direction: -1 | 1) => {
      if (!quizId) return;
      const current = buildPlayerTilesOrder(playerTilesOrder, playerBanners);
      const index = current.indexOf(id);
      if (index < 0) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      const normalized = withQuizResultsTileLast(next);
      setPlayerTilesOrder(normalized);
      emitPublicViewPatch({ playerTilesOrder: normalized });
      refreshQuizState();
    },
    [emitPublicViewPatch, playerBanners, playerTilesOrder, quizId, refreshQuizState],
  );

  const updateShowEventTitleOnPlayer = useCallback(
    (next: boolean) => {
      setShowEventTitleOnPlayer(next);
      emitPublicViewPatch({ showEventTitleOnPlayer: next });
      refreshQuizState();
    },
    [emitPublicViewPatch, refreshQuizState],
  );

  return {
    showEventTitleOnPlayer,
    setShowEventTitleOnPlayer,
    updateShowEventTitleOnPlayer,
    playerBanners,
    setPlayerBanners,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileTextColor,
    speakerTileVisible,
    programTileText,
    programTileBackgroundColor,
    programTileTextColor,
    programTileLinkUrl,
    programTileVisible,
    playerQuizResultsTileText,
    playerQuizResultsTileBackgroundColor,
    playerQuizResultsTileTextColor,
    playerQuizResultsSubQuizId,
    playerQuizResultsSubQuizIds,
    playerQuizResultsTileVisible,
    playerTilesOrder,
    setPlayerTilesOrder,
    setPlayerQuizResultsSubQuizIds,
    setPlayerQuizResultsSubQuizId,
    setPlayerQuizResultsTileVisible,
    setSpeakerTileBackgroundColor,
    setSpeakerTileTextColor,
    setProgramTileBackgroundColor,
    setProgramTileTextColor,
    applyFromPublicView,
    applyBannerClickStatsFromPublicView,
    bannerClickCounts,
    applyPrunedPlayerUi,
    createPlayerBanner,
    togglePlayerBannerVisible,
    deletePlayerBanner,
    updatePlayerBanner,
    saveSpeakerTile,
    toggleSpeakerTileVisible,
    saveProgramTile,
    toggleProgramTileVisible,
    togglePlayerQuizReportForSubQuiz,
    moveTile,
  };
}
