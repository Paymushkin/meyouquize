import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useParams } from "react-router-dom";
import { Alert, Box, Container, Snackbar, Stack } from "@mui/material";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { buildPlayerJoinUrl, buildProjectorScreenUrl } from "../publicAppOrigin";
import { useAdminPlayerTiles } from "../features/admin/useAdminPlayerTiles";
import { useAdminEventBootstrap } from "../features/admin/useAdminEventBootstrap";
import { useAdminFeedbackCatalog } from "../features/admin/useAdminFeedbackCatalog";
import { useEventParticipantNicknames } from "../features/admin/useEventParticipantNicknames";
import { useAdminSpeakerQuestions } from "../features/admin/useAdminSpeakerQuestions";
import { useAdminFontLibrary } from "../features/admin/useAdminFontLibrary";
import {
  useAdminRandomizer,
  type AdminSetPublicResultsView,
} from "../features/admin/useAdminRandomizer";
import { useAdminReport } from "../features/admin/useAdminReport";
import { useAdminReactions } from "../features/admin/useAdminReactions";
import { useAdminBrandingVisual } from "../features/admin/useAdminBrandingVisual";
import { useAdminQuestionEditor } from "../features/admin/useAdminQuestionEditor";
import { buildAdminQuestionsSectionSharedBindings } from "../features/admin/adminQuestionsSectionSharedBindings";
import { AdminEventSectionRouter } from "./adminEvent/AdminEventSectionRouter";
import { AdminEventQuestionOverlays } from "./adminEvent/AdminEventQuestionOverlays";
import { AdminEventStatusBar } from "./adminEvent/AdminEventStatusBar";
import { AdminEventNavSidebar } from "./adminEvent/AdminEventNavSidebar";
import { getCurrentPublicScreenText } from "./adminEvent/adminEventScreenLabel";
import type { PublicViewMode, PublicViewSetPatch } from "../publicViewContract";
import {
  normalizePublicViewState,
  type PublicBanner,
  type PublicViewPayload,
} from "../publicViewContract";
import {
  buildCloudManualFromQuestions,
  applyCloudManualToQuestions,
  readCloudManualFromPublicView,
} from "../features/tagCloudAdmin";
import { useAdminEventSocket } from "../hooks/useAdminEventSocket";
import { useAdminEventApi } from "../hooks/useAdminEventApi";
import { useAdminBrandingProps } from "../hooks/useAdminBrandingProps";
import { useBodyBrandBackground } from "../hooks/useBodyBrandBackground";
import { useProjectorJoinQrAdminSettings } from "../hooks/useProjectorJoinQrAdminSettings";
import { usePublicViewEmitter } from "../hooks/usePublicViewEmitter";
import { recordServerPublicView } from "../features/publicView/publicViewEmitCoordination";
import { useSpeakerQuestionsAdminActions } from "../hooks/useSpeakerQuestionsAdminActions";
import { socket } from "../socket";
import {
  buildQuestionIndexMapForSubQuiz,
  computeFirstIncompleteSubQuizId,
  type AdminEventRoom,
  type QuestionForm,
  type SubQuizSheet,
} from "../admin/adminEventForm";
import {
  leaderboardPlaceByScore,
  type LeaderboardItem,
  type LeaderboardSort,
  type QuestionResult,
  type SubQuizLeaderboardPayload,
} from "../admin/adminEventTypes";
import { parseApiErrorMessage } from "../utils/apiError";
import { patchQuestionsFromPublicView } from "../features/publicView/patchQuestionFromPublicView";
import { DEFAULT_TEMPERATURE_OPTION_WEIGHTS } from "@meyouquize/shared";

import {
  type AdminSection,
  type RoomQuestionsTab,
  readAdminUiPersistence,
  writeAdminUiQuestionsTab,
  writeAdminUiResultsSubQuizId,
  writeAdminUiSection,
} from "../features/admin/adminUiPersistence";
const ADMIN_BANNER_AUTO_HIDE_MS = 2000;
const RESULTS_UI_STORAGE_PREFIX = "mq_admin_results_ui_";
const EXPANDED_SUBQUIZ_STORAGE_PREFIX = "mq_admin_expanded_subquiz_";
const ADMIN_BODY_BG_FALLBACK = "#22313c";

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function isSupportedPublicMode(mode: unknown): mode is PublicViewMode {
  return (
    mode === "title" ||
    mode === "question" ||
    mode === "leaderboard" ||
    mode === "speaker_questions" ||
    mode === "reactions" ||
    mode === "randomizer" ||
    mode === "report"
  );
}

function getPublicBanners(value: unknown): PublicBanner[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.linkUrl !== "string" ||
      typeof row.backgroundUrl !== "string"
    )
      return [];
    const size: PublicBanner["size"] =
      row.size === "1x1" ? "1x1" : row.size === "full" ? "full" : "2x1";
    return [
      {
        id: row.id,
        linkUrl: row.linkUrl,
        backgroundUrl: row.backgroundUrl,
        size,
        isVisible: Boolean(row.isVisible),
      } satisfies PublicBanner,
    ];
  });
}

export function AdminEventPage() {
  const { eventName = "" } = useParams();
  const resultsUiStorageKey = `${RESULTS_UI_STORAGE_PREFIX}${eventName}`;
  const expandedSubQuizStorageKey = `${EXPANDED_SUBQUIZ_STORAGE_PREFIX}${eventName}`;
  const [isAuth, setIsAuth] = useState(false);
  const [room, setRoom] = useState<AdminEventRoom | null>(null);
  const [quizId, setQuizId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [subQuizSheets, setSubQuizSheets] = useState<SubQuizSheet[]>([]);
  const subQuizzesForReport = useMemo(
    () =>
      subQuizSheets.map((s) => ({
        id: s.id,
        title: s.title.trim() || "Без названия",
      })),
    [subQuizSheets],
  );
  const [roomQuestionsTab, setRoomQuestionsTab] = useState<RoomQuestionsTab>(
    () => readAdminUiPersistence(eventName).questionsTab,
  );
  const [expandedSubQuizId, setExpandedSubQuizId] = useState<string | false>(false);
  const [questionForms, setQuestionForms] = useState<QuestionForm[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [leaderboardsBySubQuiz, setLeaderboardsBySubQuiz] = useState<SubQuizLeaderboardPayload[]>(
    [],
  );
  const [resultsSubQuizId, setResultsSubQuizId] = useState<string>(
    () => readAdminUiPersistence(eventName).resultsSubQuizId,
  );
  const [confirmResetDemoOpen, setConfirmResetDemoOpen] = useState(false);
  const [voteListManageMode, setVoteListManageMode] = useState(false);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>(() => {
    if (typeof window === "undefined") return "place_asc";
    try {
      const raw = window.localStorage.getItem(resultsUiStorageKey);
      if (!raw) return "place_asc";
      const parsed = JSON.parse(raw) as { leaderboardSort?: LeaderboardSort };
      return parsed.leaderboardSort ?? "place_asc";
    } catch {
      return "place_asc";
    }
  });
  const [activeSection, setActiveSection] = useState<AdminSection>(
    () => readAdminUiPersistence(eventName).section,
  );
  const participantNicknamesPollEnabled =
    isAuth && activeSection === "questions" && roomQuestionsTab === "randomizer";
  const { eventParticipantNicknames, refreshEventParticipantNicknames } =
    useEventParticipantNicknames(eventName, isAuth, participantNicknamesPollEnabled);
  const speakerReportIdsApplierRef = useRef<(ids: unknown) => void>(() => {});
  const setPublicResultsViewRef = useRef<AdminSetPublicResultsView>(() => {});
  const emitPublicViewPatchRef = useRef<(patch: PublicViewSetPatch) => void>(() => {});
  const emitBrandingPatchRef = useRef<(patch: PublicViewSetPatch) => void>(() => {});
  const playerTileBrandSettersRef = useRef({
    setSpeakerTileBackgroundColor: (_value: string) => {},
    setSpeakerTileTextColor: (_value: string) => {},
    setProgramTileBackgroundColor: (_value: string) => {},
    setProgramTileTextColor: (_value: string) => {},
  });
  const [publicViewMode, setPublicViewMode] = useState<PublicViewMode>(() => {
    if (typeof window === "undefined") return "title";
    try {
      const raw = window.localStorage.getItem(resultsUiStorageKey);
      if (!raw) return "title";
      const parsed = JSON.parse(raw) as { publicViewMode?: PublicViewMode };
      return parsed.publicViewMode === "leaderboard" ||
        parsed.publicViewMode === "speaker_questions" ||
        parsed.publicViewMode === "reactions" ||
        parsed.publicViewMode === "randomizer"
        ? parsed.publicViewMode
        : "title";
    } catch {
      return "title";
    }
  });
  const [publicViewQuestionId, setPublicViewQuestionId] = useState<string | undefined>(undefined);
  const [playerVisibleResultQuestionIds, setPlayerVisibleResultQuestionIds] = useState<string[]>(
    [],
  );
  const [questionRevealStage, setQuestionRevealStage] = useState<"options" | "results">("options");
  const [highlightedLeadersCount, setHighlightedLeadersCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    try {
      const raw = window.localStorage.getItem(resultsUiStorageKey);
      if (!raw) return 3;
      const parsed = JSON.parse(raw) as { highlightedLeadersCount?: number };
      if (typeof parsed.highlightedLeadersCount !== "number") return 3;
      return Math.max(0, Math.min(100, Math.trunc(parsed.highlightedLeadersCount)));
    } catch {
      return 3;
    }
  });
  const [showFirstCorrectAnswerer, setShowFirstCorrectAnswerer] = useState(false);
  const [firstCorrectWinnersCount, setFirstCorrectWinnersCount] = useState(1);
  const {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
  } = useProjectorJoinQrAdminSettings();
  const branding = useAdminBrandingVisual({
    emitBrandingPatchRef,
    tileBrandSettersRef: playerTileBrandSettersRef,
  });
  const { availableFonts, setAvailableFonts, loadFontLibrary } = useAdminFontLibrary();
  const [editableTitle, setEditableTitle] = useState("");
  const [message, setMessage] = useState("");
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [adminSocketStatus, setAdminSocketStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >(() => (socket.connected ? "connected" : "disconnected"));
  const lastSavedSnapshotRef = useRef("");
  const syncedSubQuizIdsKeyRef = useRef("");
  const questionFormsRef = useRef<QuestionForm[]>([]);
  questionFormsRef.current = questionForms;
  /** Чтобы не вызывать removeItem(localStorage) на первом кадре, пока эффект не восстановил раскрытие из LS. */
  const isFirstExpandedPersistEffect = useRef(true);

  useBodyBrandBackground({
    backgroundColor: branding.brandBodyBackgroundColor?.trim() || ADMIN_BODY_BG_FALLBACK,
    clearRootBackground: true,
    resetOverflowX: true,
  });

  const {
    authChecked,
    checkSession,
    loadRoom,
    persistQuestions,
    persistTagCloudManual,
    lastPersistQuestionsErrorRef,
    patchQuestionProjectorSettings,
    patchQuestionAdminDone,
    saveQuizTitle: saveQuizTitleApi,
    saveSubQuizTitle: saveSubQuizTitleApi,
  } = useAdminEventApi({
    eventName,
    lastSavedSnapshotRef,
    setIsAuth,
    setRoom,
    setQuizId,
    setQuestionId,
    setSubQuizSheets,
    setQuestionForms,
    setSelectedQuestionIndex,
    setMessage,
  });

  const speakerQuestions = useAdminSpeakerQuestions((patch) =>
    emitPublicViewPatchRef.current(patch),
  );
  speakerReportIdsApplierRef.current = speakerQuestions.applyReportSpeakerQuestionIds;

  const adminReport = useAdminReport({
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
    onSpeakerQuestionIdsFromView: (ids) => speakerReportIdsApplierRef.current(ids),
  });

  const feedbackCatalog = useAdminFeedbackCatalog({
    eventName,
    isAuth,
    setAvailableFeedbackForms: adminReport.setAvailableFeedbackForms,
    setReportFeedbackFormIds: adminReport.setReportFeedbackFormIds,
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
  });

  const randomizer = useAdminRandomizer({
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
    setPublicResultsView: (mode, questionId, patch) =>
      setPublicResultsViewRef.current(mode, questionId, patch),
    setMessage,
    eventParticipantNicknames,
  });

  const adminReactions = useAdminReactions({
    eventName,
    quizId,
    roomPublicView: room?.publicView,
    publicViewMode,
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
    setPublicResultsView: (mode, questionId, patch) =>
      setPublicResultsViewRef.current(mode, questionId, patch),
    setMessage,
  });

  const playerTiles = useAdminPlayerTiles({
    quizId,
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
    setMessage,
    setSpeakerQuestionsEnabled: speakerQuestions.setEnabled,
    subQuizzesForReport: subQuizzesForReport,
  });

  const applyPublicViewReportRandomizerRef = useRef<(payload: PublicViewPayload) => void>(() => {});
  const onPublicViewSocketExtrasRef = useRef<(payload: PublicViewPayload) => void>(() => {});
  applyPublicViewReportRandomizerRef.current = (payload) => {
    randomizer.applyFromPublicView(payload);
    adminReport.applyFromPublicView(payload);
  };
  onPublicViewSocketExtrasRef.current = (payload) => {
    adminReactions.applyFromPublicView(payload);
    playerTiles.applyBannerClickStatsFromPublicView(payload);
    applyPublicViewReportRandomizerRef.current(payload);
    const normalizedView = normalizePublicViewState(payload);
    const cloudManual = readCloudManualFromPublicView(normalizedView);
    setQuestionForms((prev) => applyCloudManualToQuestions(prev, cloudManual));
    speakerQuestions.applyScreenVisibilityFromPublicView(normalizedView);
  };

  const autoSaveQuestions = useCallback(async () => {
    await persistQuestions(questionForms, subQuizSheets);
  }, [persistQuestions, questionForms, subQuizSheets]);

  /** Синхронно до размонтирования диалога: иначе эффект персиста при `false` стирает LS, а отложенный setTimeout не успевает. */
  const pinExpandedSubQuiz = useCallback(
    (subQuizId: string) => {
      flushSync(() => {
        setExpandedSubQuizId(subQuizId);
      });
      try {
        window.localStorage.setItem(expandedSubQuizStorageKey, subQuizId);
      } catch {
        /* ignore */
      }
    },
    [expandedSubQuizStorageKey],
  );

  function saveQuizTitle() {
    void saveQuizTitleApi(editableTitle, room?.title, quizId);
  }

  const joinUrl = useMemo(() => {
    if (!room) return "";
    return buildPlayerJoinUrl(room.slug);
  }, [room]);

  const screenUrl = useMemo(() => {
    if (!room) return "";
    return buildProjectorScreenUrl(room.slug);
  }, [room]);

  const votesIndexMap = useMemo(
    () => buildQuestionIndexMapForSubQuiz(questionForms, null),
    [questionForms],
  );

  const activeVoteIndices = useMemo(
    () => votesIndexMap.filter((i) => !questionForms[i]?.adminDone),
    [votesIndexMap, questionForms],
  );
  const doneVoteIndices = useMemo(
    () => votesIndexMap.filter((i) => Boolean(questionForms[i]?.adminDone)),
    [votesIndexMap, questionForms],
  );
  const activeVotesSelectedListIndex = useMemo(() => {
    const si = activeVoteIndices.indexOf(selectedQuestionIndex);
    return si < 0 ? 0 : si;
  }, [activeVoteIndices, selectedQuestionIndex]);
  const doneVotesSelectedListIndex = useMemo(() => {
    const si = doneVoteIndices.indexOf(selectedQuestionIndex);
    return si < 0 ? 0 : si;
  }, [doneVoteIndices, selectedQuestionIndex]);
  const availableVoteQuestions = useMemo(
    () =>
      votesIndexMap
        .map((index) => questionForms[index])
        .filter((question): question is QuestionForm => Boolean(question?.id))
        .map((question) => ({
          id: question.id!,
          text: question.text.trim() || "Без названия",
        })),
    [questionForms, votesIndexMap],
  );
  const availableQuizQuestions = useMemo(() => {
    const titleById = new Map(
      subQuizSheets.map((sheet) => [sheet.id, sheet.title.trim() || "Без названия"] as const),
    );
    const grouped = new Map<
      string,
      { subQuizId: string; subQuizTitle: string; questions: Array<{ id: string; text: string }> }
    >();
    for (const question of questionForms) {
      if (!question.id || !question.subQuizId) continue;
      const key = question.subQuizId;
      const group = grouped.get(key) ?? {
        subQuizId: key,
        subQuizTitle: titleById.get(key) ?? "Без названия",
        questions: [],
      };
      group.questions.push({ id: question.id, text: question.text.trim() || "Без названия" });
      grouped.set(key, group);
    }
    return Array.from(grouped.values());
  }, [questionForms, subQuizSheets]);

  useEffect(() => {
    adminReport.setToggleContext({
      availableVoteQuestionIds: availableVoteQuestions.map((item) => item.id),
      availableQuizQuestions,
      availableFeedbackFormIds: adminReport.availableFeedbackForms.map((form) => form.id),
      reactionWidgetIds: adminReactions.widgets.map((widget) => widget.id),
      randomizerHistory: randomizer.history,
      randomizerCurrentWinners: randomizer.currentWinners,
    });
  }, [
    adminReport.setToggleContext,
    adminReport.availableFeedbackForms,
    availableQuizQuestions,
    availableVoteQuestions,
    randomizer.currentWinners,
    randomizer.history,
    adminReactions.widgets,
  ]);

  /** Только набор id подквизов (без порядка): после PUT порядок с сервера может отличаться — не сбрасываем раскрытие. */
  const subQuizIdsKey = useMemo(
    () =>
      [...subQuizSheets]
        .map((s) => s.id)
        .sort()
        .join(","),
    [subQuizSheets],
  );

  useEffect(() => {
    syncedSubQuizIdsKeyRef.current = "";
    isFirstExpandedPersistEffect.current = true;
  }, [eventName]);

  useEffect(() => {
    if (!subQuizIdsKey) {
      setExpandedSubQuizId(false);
      return;
    }
    if (subQuizIdsKey === syncedSubQuizIdsKeyRef.current) return;
    syncedSubQuizIdsKeyRef.current = subQuizIdsKey;

    const sheetIds = new Set(subQuizSheets.map((s) => s.id));
    let fromStorage: string | null = null;
    try {
      fromStorage =
        typeof window !== "undefined"
          ? window.localStorage.getItem(expandedSubQuizStorageKey)
          : null;
    } catch {
      fromStorage = null;
    }
    if (fromStorage && sheetIds.has(fromStorage)) {
      setExpandedSubQuizId(fromStorage);
      return;
    }

    setExpandedSubQuizId((prev) => {
      if (typeof prev === "string" && sheetIds.has(prev)) return prev;
      return computeFirstIncompleteSubQuizId(subQuizSheets, questionFormsRef.current);
    });
  }, [subQuizIdsKey, subQuizSheets, expandedSubQuizStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !eventName) return;
    if (isFirstExpandedPersistEffect.current) {
      isFirstExpandedPersistEffect.current = false;
      return;
    }
    try {
      if (expandedSubQuizId === false) {
        window.localStorage.removeItem(expandedSubQuizStorageKey);
      } else {
        window.localStorage.setItem(expandedSubQuizStorageKey, expandedSubQuizId);
      }
    } catch {
      /* ignore quota / private mode */
    }
  }, [eventName, expandedSubQuizId, expandedSubQuizStorageKey]);

  useEffect(() => {
    if (!eventName) return;
    const persisted = readAdminUiPersistence(eventName);
    setActiveSection(persisted.section);
    setRoomQuestionsTab(persisted.questionsTab);
    if (persisted.resultsSubQuizId) {
      setResultsSubQuizId(persisted.resultsSubQuizId);
    }
  }, [eventName]);

  useEffect(() => {
    if (!eventName) return;
    writeAdminUiSection(eventName, activeSection);
  }, [eventName, activeSection]);

  useEffect(() => {
    if (!eventName) return;
    writeAdminUiQuestionsTab(eventName, roomQuestionsTab);
  }, [eventName, roomQuestionsTab]);

  useEffect(() => {
    if (!eventName || !resultsSubQuizId) return;
    writeAdminUiResultsSubQuizId(eventName, resultsSubQuizId);
  }, [eventName, resultsSubQuizId]);

  useEffect(() => {
    setExpandedQuestionSettingsIndex(null);
  }, [roomQuestionsTab]);

  useEffect(() => {
    if (roomQuestionsTab === "quizzes") {
      setExpandedQuestionSettingsIndex(null);
    }
  }, [expandedSubQuizId, roomQuestionsTab]);

  useEffect(() => {
    if (leaderboardsBySubQuiz.length === 0) return;
    if (resultsSubQuizId && leaderboardsBySubQuiz.some((x) => x.subQuizId === resultsSubQuizId)) {
      return;
    }
    const persisted = readAdminUiPersistence(eventName).resultsSubQuizId;
    if (persisted && leaderboardsBySubQuiz.some((x) => x.subQuizId === persisted)) {
      setResultsSubQuizId(persisted);
      return;
    }
    setResultsSubQuizId(leaderboardsBySubQuiz[0]?.subQuizId ?? "");
  }, [leaderboardsBySubQuiz, eventName, resultsSubQuizId]);

  const leaderboardForTable = useMemo(() => {
    const hit = leaderboardsBySubQuiz.find((x) => x.subQuizId === resultsSubQuizId);
    return hit?.rows ?? leaderboard;
  }, [leaderboardsBySubQuiz, resultsSubQuizId, leaderboard]);

  const displayedLeaderboard = useMemo(() => {
    const sorted = [...leaderboardForTable];
    if (leaderboardSort === "place_asc" || leaderboardSort === "place_desc") {
      const placeMap = leaderboardPlaceByScore(leaderboardForTable);
      sorted.sort((a, b) => {
        const pa = placeMap.get(a.participantId) ?? Number.MAX_SAFE_INTEGER;
        const pb = placeMap.get(b.participantId) ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) {
          return leaderboardSort === "place_asc" ? pa - pb : pb - pa;
        }
        return a.nickname.localeCompare(b.nickname, "ru");
      });
      return sorted;
    }
    sorted.sort((a, b) => {
      if (leaderboardSort === "score_desc") return b.score - a.score;
      if (leaderboardSort === "score_asc") return a.score - b.score;
      if (leaderboardSort === "name_desc") return b.nickname.localeCompare(a.nickname, "ru");
      return a.nickname.localeCompare(b.nickname, "ru");
    });
    return sorted;
  }, [leaderboardForTable, leaderboardSort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      leaderboardSort,
      highlightedLeadersCount,
      publicViewMode:
        publicViewMode === "leaderboard" ||
        publicViewMode === "speaker_questions" ||
        publicViewMode === "reactions"
          ? publicViewMode
          : "title",
    };
    window.localStorage.setItem(resultsUiStorageKey, JSON.stringify(payload));
  }, [resultsUiStorageKey, leaderboardSort, highlightedLeadersCount, publicViewMode]);

  const setSpeakerTileBackgroundColorFromRef = useCallback((value: string) => {
    playerTileBrandSettersRef.current.setSpeakerTileBackgroundColor(value);
  }, []);
  const setSpeakerTileTextColorFromRef = useCallback((value: string) => {
    playerTileBrandSettersRef.current.setSpeakerTileTextColor(value);
  }, []);
  const setProgramTileBackgroundColorFromRef = useCallback((value: string) => {
    playerTileBrandSettersRef.current.setProgramTileBackgroundColor(value);
  }, []);
  const setProgramTileTextColorFromRef = useCallback((value: string) => {
    playerTileBrandSettersRef.current.setProgramTileTextColor(value);
  }, []);

  const { setupSocketListeners, clearSocketListeners } = useAdminEventSocket({
    eventName,
    setQuestionId,
    setMessage,
    setQuestionResults,
    setLeaderboard,
    setLeaderboardsBySubQuiz,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionRevealStage,
    setHighlightedLeadersCount,
    setQuestionForms,
    setProjectorBackground: branding.setProjectorBackground,
    setCloudQuestionColor: branding.setCloudQuestionColor,
    setCloudTagColors: branding.setCloudTagColors,
    setCloudTopTagColor: branding.setCloudTopTagColor,
    setCloudCorrectTagColor: branding.setCloudCorrectTagColor,
    setCloudDensity: branding.setCloudDensity,
    setCloudTagPadding: branding.setCloudTagPadding,
    setCloudSpiral: branding.setCloudSpiral,
    setCloudAnimationStrength: branding.setCloudAnimationStrength,
    setVoteQuestionTextColor: branding.setVoteQuestionTextColor,
    setVoteOptionTextColor: branding.setVoteOptionTextColor,
    setVoteOptionBorderColor: branding.setVoteOptionBorderColor,
    setVoteProgressTrackColor: branding.setVoteProgressTrackColor,
    setVoteProgressBarColor: branding.setVoteProgressBarColor,
    setPlayerVoteOptionTextColor: branding.setPlayerVoteOptionTextColor,
    setPlayerVoteProgressTrackColor: branding.setPlayerVoteProgressTrackColor,
    setPlayerVoteProgressBarColor: branding.setPlayerVoteProgressBarColor,
    setProjectorJoinQrVisible,
    setProjectorJoinQrText,
    setProjectorJoinQrTextColor,
    setProjectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayCorner,
    setBrandPrimaryColor: branding.setBrandPrimaryColor,
    setBrandAccentColor: branding.setBrandAccentColor,
    setBrandSurfaceColor: branding.setBrandSurfaceColor,
    setBrandTextColor: branding.setBrandTextColor,
    setBrandInputTextColor: branding.setBrandInputTextColor,
    setBrandFontFamily: branding.setBrandFontFamily,
    setBrandFontUrl: branding.setBrandFontUrl,
    setBrandLogoUrl: branding.setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl: branding.setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl: branding.setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor: branding.setBrandBodyBackgroundColor,
    setBrandTheme: branding.setBrandTheme,
    setSpeakerTileBackgroundColor: setSpeakerTileBackgroundColorFromRef,
    setSpeakerTileTextColor: setSpeakerTileTextColorFromRef,
    setProgramTileBackgroundColor: setProgramTileBackgroundColorFromRef,
    setProgramTileTextColor: setProgramTileTextColorFromRef,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
    setSpeakerQuestionsPayload: speakerQuestions.setPayload,
    setReactionSession: adminReactions.setReactionSession,
    setOnlineUsersCount,
    onPublicViewExtrasRef: onPublicViewSocketExtrasRef,
  });

  const { emitPublicViewSet, emitPublicViewPatch, emitBrandingPatch } = usePublicViewEmitter({
    quizId,
    publicViewMode,
    publicViewQuestionId,
    questionRevealStage,
    highlightedLeadersCount,
    resultsLeaderboardSubQuizId: resultsSubQuizId,
    questionForms,
    projectorBackground: branding.projectorBackground,
    cloudQuestionColor: branding.cloudQuestionColor,
    cloudTagColors: branding.cloudTagColors,
    cloudTopTagColor: branding.cloudTopTagColor,
    cloudCorrectTagColor: branding.cloudCorrectTagColor,
    cloudDensity: branding.cloudDensity,
    cloudTagPadding: branding.cloudTagPadding,
    cloudSpiral: branding.cloudSpiral,
    cloudAnimationStrength: branding.cloudAnimationStrength,
    voteQuestionTextColor: branding.voteQuestionTextColor,
    voteOptionTextColor: branding.voteOptionTextColor,
    voteOptionBorderColor: branding.voteOptionBorderColor,
    voteProgressTrackColor: branding.voteProgressTrackColor,
    voteProgressBarColor: branding.voteProgressBarColor,
    playerVoteOptionTextColor: branding.playerVoteOptionTextColor,
    playerVoteProgressTrackColor: branding.playerVoteProgressTrackColor,
    playerVoteProgressBarColor: branding.playerVoteProgressBarColor,
    projectorJoinQrVisible,
    projectorJoinQrText,
    projectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    showFirstCorrectAnswerer,
    firstCorrectWinnersCount,
    showEventTitleOnPlayer: playerTiles.showEventTitleOnPlayer,
    playerAutoJoinRandomNickname: playerTiles.playerAutoJoinRandomNickname,
    playerBanners: playerTiles.playerBanners,
    speakerTileText: playerTiles.speakerTileText,
    speakerTileBackgroundColor: playerTiles.speakerTileBackgroundColor,
    speakerTileTextColor: playerTiles.speakerTileTextColor,
    speakerTileVisible: playerTiles.speakerTileVisible,
    speakerQuestionsEnabled: speakerQuestions.enabled,
    programTileText: playerTiles.programTileText,
    programTileBackgroundColor: playerTiles.programTileBackgroundColor,
    programTileTextColor: playerTiles.programTileTextColor,
    programTileLinkUrl: playerTiles.programTileLinkUrl,
    programTileVisible: playerTiles.programTileVisible,
    playerQuizResultsTileVisible: playerTiles.playerQuizResultsTileVisible,
    playerQuizResultsTileText: playerTiles.playerQuizResultsTileText,
    playerQuizResultsTileBackgroundColor: playerTiles.playerQuizResultsTileBackgroundColor,
    playerQuizResultsTileTextColor: playerTiles.playerQuizResultsTileTextColor,
    playerQuizResultsSubQuizId: playerTiles.playerQuizResultsSubQuizId,
    playerQuizResultsSubQuizIds: playerTiles.playerQuizResultsSubQuizIds,
    playerVisibleResultQuestionIds,
    playerTilesOrder: playerTiles.playerTilesOrder,
    reactionsOverlayText: adminReactions.overlayText,
    reactionsWidgets: adminReactions.widgets,
    randomizerMode: randomizer.mode,
    randomizerListMode: randomizer.listMode,
    randomizerTitle: randomizer.title,
    randomizerNamesText: randomizer.namesText,
    randomizerMinNumber: randomizer.minNumber,
    randomizerMaxNumber: randomizer.maxNumber,
    randomizerWinnersCount: randomizer.winnersCount,
    randomizerExcludeWinners: randomizer.excludeWinners,
    randomizerSelectedWinners: randomizer.selectedWinners,
    randomizerCurrentWinners: randomizer.currentWinners,
    randomizerAnimationPool: randomizer.animationPool,
    randomizerHistory: randomizer.history,
    randomizerRunId: randomizer.runId,
    reportTitle: adminReport.reportTitle,
    reportModules: adminReport.reportModules,
    reportVoteQuestionIds: adminReport.reportVoteQuestionIds,
    reportQuizQuestionIds: adminReport.reportQuizQuestionIds,
    reportQuizSubQuizIds: adminReport.reportQuizSubQuizIds,
    reportSubQuizHideParticipantTableIds: adminReport.reportSubQuizHideParticipantTableIds,
    reportRandomizerRunIds: adminReport.reportRandomizerRunIds,
    reportReactionsWidgetIds: adminReport.reportReactionsWidgetIds,
    reportSpeakerQuestionIds: speakerQuestions.reportSpeakerQuestionIds,
    reportFeedbackFormIds: adminReport.reportFeedbackFormIds,
    reportPublished: adminReport.reportPublished,
    brandPrimaryColor: branding.brandPrimaryColor,
    brandAccentColor: branding.brandAccentColor,
    brandSurfaceColor: branding.brandSurfaceColor,
    brandTextColor: branding.brandTextColor,
    brandInputTextColor: branding.brandInputTextColor,
    brandFontFamily: branding.brandFontFamily,
    brandFontUrl: branding.brandFontUrl,
    brandLogoUrl: branding.brandLogoUrl,
    brandPlayerBackgroundImageUrl: branding.brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: branding.brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor: branding.brandBodyBackgroundColor,
    brandTheme: branding.brandTheme,
  });

  const emitPublicViewSetRef = useRef(emitPublicViewSet);
  emitPublicViewSetRef.current = emitPublicViewSet;
  emitPublicViewPatchRef.current = emitPublicViewPatch;
  emitBrandingPatchRef.current = emitBrandingPatch;
  playerTileBrandSettersRef.current = {
    setSpeakerTileBackgroundColor: playerTiles.setSpeakerTileBackgroundColor,
    setSpeakerTileTextColor: playerTiles.setSpeakerTileTextColor,
    setProgramTileBackgroundColor: playerTiles.setProgramTileBackgroundColor,
    setProgramTileTextColor: playerTiles.setProgramTileTextColor,
  };

  const persistCloudManualSnapshot = useCallback(
    (forms: QuestionForm[]) => {
      void persistTagCloudManual(buildCloudManualFromQuestions(forms));
    },
    [persistTagCloudManual],
  );

  const updateShowFirstCorrectAnswerer = useCallback(
    (next: boolean, questionIdForProjector?: string) => {
      setShowFirstCorrectAnswerer(next);
      if (next && questionIdForProjector) {
        setPublicViewMode("question");
        setPublicViewQuestionId(questionIdForProjector);
        setQuestionRevealStage("results");
      }
      if (!quizId) return;
      if (next && questionIdForProjector) {
        emitPublicViewSet({
          mode: "question",
          questionId: questionIdForProjector,
          questionRevealStage: "results",
          showFirstCorrectAnswerer: true,
        });
      } else {
        emitPublicViewPatch({ showFirstCorrectAnswerer: next });
      }
    },
    [emitPublicViewPatch, emitPublicViewSet, quizId],
  );

  const questionEditor = useAdminQuestionEditor({
    quizId,
    questionForms,
    setQuestionForms,
    subQuizSheets,
    setSubQuizSheets,
    selectedQuestionIndex,
    setSelectedQuestionIndex,
    setQuestionId,
    questionResults,
    persistQuestions,
    persistCloudManualSnapshot,
    lastPersistQuestionsErrorRef,
    patchQuestionProjectorSettings,
    patchQuestionAdminDone,
    setMessage,
    pinExpandedSubQuiz,
    setExpandedSubQuizId,
    setRoomQuestionsTab,
    syncedSubQuizIdsKeyRef,
    publicViewMode,
    publicViewQuestionId,
    setPublicViewMode,
    setPublicViewQuestionId,
    setQuestionRevealStage,
    emitPublicViewSet,
    emitPublicViewPatch,
    resultsSubQuizId,
    setResultsSubQuizId,
    playerVisibleResultQuestionIds,
    setPlayerVisibleResultQuestionIds,
    playerTiles,
    adminReport,
    showFirstCorrectAnswerer,
    setShowFirstCorrectAnswerer,
    updateShowFirstCorrectAnswerer,
  });

  setPublicResultsViewRef.current = questionEditor.setPublicResultsView;

  useAdminEventBootstrap({
    eventName,
    isAuth,
    checkSession,
    loadRoom,
  });

  useEffect(() => {
    if (!isAuth) return;
    const needFeedbackCatalog =
      activeSection === "report" ||
      (activeSection === "questions" && roomQuestionsTab === "feedback");
    if (needFeedbackCatalog) void feedbackCatalog.ensureCatalogLoaded();
  }, [isAuth, activeSection, roomQuestionsTab, feedbackCatalog.ensureCatalogLoaded]);

  useEffect(() => {
    if (isAuth && activeSection === "branding") void loadFontLibrary();
  }, [isAuth, activeSection, loadFontLibrary]);

  const prevOnlineUsersCountRef = useRef(0);
  useEffect(() => {
    if (onlineUsersCount > prevOnlineUsersCountRef.current) {
      void refreshEventParticipantNicknames();
    }
    prevOnlineUsersCountRef.current = onlineUsersCount;
  }, [onlineUsersCount, refreshEventParticipantNicknames]);

  useEffect(() => {
    setupSocketListeners();
    return () => {
      clearSocketListeners();
    };
  }, [clearSocketListeners, setupSocketListeners]);

  useEffect(() => {
    const onConnect = () => setAdminSocketStatus("connected");
    const onDisconnect = () => setAdminSocketStatus("disconnected");
    const onConnectError = () => setAdminSocketStatus("disconnected");
    const onReconnectAttempt = () => setAdminSocketStatus("connecting");
    const onReconnect = () => setAdminSocketStatus("connected");

    if (socket.connected) setAdminSocketStatus("connected");
    else setAdminSocketStatus("connecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.io.on("reconnect", onReconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.io.off("reconnect", onReconnect);
    };
  }, []);

  useEffect(() => {
    const syncStatusFromSocket = () => {
      setAdminSocketStatus((prev) => {
        if (socket.connected) return "connected";
        return prev === "connected" ? "disconnected" : prev;
      });
    };
    syncStatusFromSocket();
    const timerId = window.setInterval(syncStatusFromSocket, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  /** Подтянуть сохранённое на сервере состояние экрана (включая цвета) после loadRoom */
  const applyRoomPublicViewFromServerRef = useRef<(pv: PublicViewPayload) => void>(() => {});
  applyRoomPublicViewFromServerRef.current = (pv) => {
    recordServerPublicView({
      mode: pv.mode,
      questionId: pv.questionId,
      questionRevealStage: pv.questionRevealStage,
      showFirstCorrectAnswerer: pv.showFirstCorrectAnswerer,
      showVoteCount: pv.showVoteCount,
      showQuestionTitle: pv.showQuestionTitle,
      leaderboardSubQuizId: pv.leaderboardSubQuizId,
      highlightedLeadersCount: pv.highlightedLeadersCount,
    });
    if (isSupportedPublicMode(pv.mode)) {
      setPublicViewMode(pv.mode);
    }
    setPublicViewQuestionId(typeof pv.questionId === "string" ? pv.questionId : undefined);
    setQuestionRevealStage(pv.questionRevealStage === "results" ? "results" : "options");
    if (typeof pv.highlightedLeadersCount === "number") {
      setHighlightedLeadersCount(pv.highlightedLeadersCount);
    }
    if (typeof pv.leaderboardSubQuizId === "string" && pv.leaderboardSubQuizId.trim()) {
      setResultsSubQuizId(pv.leaderboardSubQuizId.trim());
    }
    const qid = typeof pv.questionId === "string" ? pv.questionId : undefined;
    if (qid) setQuestionForms((prev) => patchQuestionsFromPublicView(prev, pv));
    const cloudManual = readCloudManualFromPublicView(pv);
    setQuestionForms((prev) => applyCloudManualToQuestions(prev, cloudManual));
    branding.applyFromPublicView(pv);
    if (typeof pv.showFirstCorrectAnswerer === "boolean") {
      setShowFirstCorrectAnswerer(pv.showFirstCorrectAnswerer);
    }
    if (typeof pv.firstCorrectWinnersCount === "number") {
      setFirstCorrectWinnersCount(clampInt(pv.firstCorrectWinnersCount, 1, 20));
    }
    speakerQuestions.applyRoomPublicViewSlice(pv);
    randomizer.applyFromPublicView(pv, { roomLoad: true });
    adminReport.applyFromPublicView(pv);
    adminReactions.applyFromPublicView(pv);
    const nextBanners = getPublicBanners(pv.playerBanners);
    playerTiles.applyFromPublicView(pv, nextBanners);
    if (Array.isArray(pv.playerVisibleResultQuestionIds)) {
      setPlayerVisibleResultQuestionIds(
        pv.playerVisibleResultQuestionIds.filter((x): x is string => typeof x === "string"),
      );
    }
  };

  useEffect(() => {
    if (!room?.publicView || typeof room.publicView !== "object") return;
    applyRoomPublicViewFromServerRef.current(normalizePublicViewState(room.publicView));
  }, [room?.id, room?.publicView]);

  useEffect(() => {
    document.title = "Админ";
  }, []);

  useEffect(() => {
    setEditableTitle(room?.title ?? "");
  }, [room?.title]);

  const adminBannerSeverity = useMemo((): "success" | "warning" | "info" => {
    if (!message) return "info";
    if (/сохранен|сохранена|добавлен|обнулен|завершен|удалён|удален/i.test(message))
      return "success";
    if (/сначала|не найден|пустой|неверн|ошибк/i.test(message.toLowerCase())) return "warning";
    return "info";
  }, [message]);

  const currentPublicScreenText = useMemo(() => {
    return getCurrentPublicScreenText({
      mode: publicViewMode,
      projectorJoinQrVisible,
      eventTitle: room?.title,
    });
  }, [publicViewMode, projectorJoinQrVisible, room?.title]);
  const brandingProps = useAdminBrandingProps({
    brandTheme: branding.brandTheme,
    onBrandThemeChange: branding.handleBrandThemeChange,
    projectorBackground: branding.projectorBackground,
    setProjectorBackground: branding.setProjectorBackground,
    brandBodyBackgroundColor: branding.brandBodyBackgroundColor,
    setBrandBodyBackgroundColor: branding.setBrandBodyBackgroundColor,
    voteQuestionTextColor: branding.voteQuestionTextColor,
    setVoteQuestionTextColor: branding.setVoteQuestionTextColor,
    voteOptionTextColor: branding.voteOptionTextColor,
    setVoteOptionTextColor: branding.setVoteOptionTextColor,
    voteOptionBorderColor: branding.voteOptionBorderColor,
    setVoteOptionBorderColor: branding.setVoteOptionBorderColor,
    voteProgressTrackColor: branding.voteProgressTrackColor,
    setVoteProgressTrackColor: branding.setVoteProgressTrackColor,
    voteProgressBarColor: branding.voteProgressBarColor,
    setVoteProgressBarColor: branding.setVoteProgressBarColor,
    playerVoteOptionTextColor: branding.playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor: branding.setPlayerVoteOptionTextColor,
    playerVoteProgressBarColor: branding.playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor: branding.setPlayerVoteProgressBarColor,
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
    cloudQuestionColor: branding.cloudQuestionColor,
    setCloudQuestionColor: branding.setCloudQuestionColor,
    cloudTopTagColor: branding.cloudTopTagColor,
    setCloudTopTagColor: branding.setCloudTopTagColor,
    cloudCorrectTagColor: branding.cloudCorrectTagColor,
    setCloudCorrectTagColor: branding.setCloudCorrectTagColor,
    cloudTagColors: branding.cloudTagColors,
    setCloudTagColors: branding.setCloudTagColors,
    cloudDensity: branding.cloudDensity,
    setCloudDensity: branding.setCloudDensity,
    cloudTagPadding: branding.cloudTagPadding,
    setCloudTagPadding: branding.setCloudTagPadding,
    cloudSpiral: branding.cloudSpiral,
    setCloudSpiral: branding.setCloudSpiral,
    cloudAnimationStrength: branding.cloudAnimationStrength,
    setCloudAnimationStrength: branding.setCloudAnimationStrength,
    brandPrimaryColor: branding.brandPrimaryColor,
    setBrandPrimaryColor: branding.setBrandPrimaryColor,
    brandAccentColor: branding.brandAccentColor,
    setBrandAccentColor: branding.setBrandAccentColor,
    brandSurfaceColor: branding.brandSurfaceColor,
    setBrandSurfaceColor: branding.setBrandSurfaceColor,
    brandTextColor: branding.brandTextColor,
    setBrandTextColor: branding.setBrandTextColor,
    brandInputTextColor: branding.brandInputTextColor,
    setBrandInputTextColor: branding.setBrandInputTextColor,
    brandFontFamily: branding.brandFontFamily,
    setBrandFontFamily: branding.setBrandFontFamily,
    setBrandFontUrl: branding.setBrandFontUrl,
    availableFonts,
    onUploadFont: uploadCustomFont,
    onUploadFontError: setMessage,
    brandLogoUrl: branding.brandLogoUrl,
    setBrandLogoUrl: branding.setBrandLogoUrl,
    brandPlayerBackgroundImageUrl: branding.brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl: branding.setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: branding.brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl: branding.setBrandProjectorBackgroundImageUrl,
    onUploadMedia: uploadBannerMedia,
    emitBrandingPatch,
  });

  function resetAllAnswers() {
    if (!quizId) return;
    socket.emit("admin:answers:reset-all", { quizId });
    setMessage("Все ответы и ручные правки результатов в комнате обнулены");
  }

  function exportLeaderboardCsv() {
    const placeMap = leaderboardPlaceByScore(displayedLeaderboard);
    const rows = displayedLeaderboard.map((item) => ({
      place: placeMap.get(item.participantId) ?? 0,
      nickname: item.nickname,
      score: item.score,
    }));
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const header = ["Место", "Участник", "Баллы"];
    const csvContent = [
      header.map(escapeCsv).join(","),
      ...rows.map((row) => [row.place, row.nickname, row.score].map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard-${eventName || "quiz"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const resetDemoToDefault = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/reset-test-data`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}), // endpoint currently doesn't use body
        },
      );
      if (!res.ok) {
        setMessage("Не удалось сбросить demo");
        return;
      }
      const data = (await res.json()) as { quizId?: string };
      setConfirmResetDemoOpen(false);
      setMessage("Demo сброшен");
      await loadRoom();
      socket.emit("results:subscribe", { slug: eventName });
      socket.emit("speaker:questions:subscribe", { slug: eventName, viewer: "admin" });
      if (data.quizId) {
        socket.emit("quiz:state:refresh", { quizId: data.quizId });
      } else if (quizId) {
        socket.emit("quiz:state:refresh", { quizId });
      }
    } catch {
      setConfirmResetDemoOpen(false);
      setMessage("Не удалось сбросить demo");
    }
  }, [API_BASE, eventName, loadRoom, quizId, setMessage]);

  async function uploadBannerMedia(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/api/admin/media/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(parseApiErrorMessage(payload, "Не удалось загрузить файл"));
    }
    const payload = (await response.json()) as { url: string };
    if (!payload?.url) throw new Error("Сервер не вернул URL файла");
    setMessage("Картинка загружена");
    return payload.url;
  }

  async function uploadCustomFont(
    files: File[],
    family: string,
    kind: "static" | "variable",
  ): Promise<{ family: string; url: string }> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("family", family);
    form.append("kind", kind);
    const response = await fetch(`${API_BASE}/api/admin/fonts/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      reused?: boolean;
      fonts?: Array<{ id: string; family: string; url: string; kind?: "static" | "variable" }>;
      replacedFamily?: boolean;
      duplicateCount?: number;
      details?: Array<{
        fileName: string;
        status: "created" | "duplicate";
        family: string;
        kind: "static" | "variable";
      }>;
    };
    if (!response.ok) {
      console.error("[fonts] upload failed", {
        status: response.status,
        error: payload.error,
      });
      throw new Error(payload.error || "Не удалось загрузить шрифт");
    }
    if (
      !Array.isArray(payload.fonts) ||
      payload.fonts.length === 0 ||
      !payload.fonts[0]?.family ||
      !payload.fonts[0]?.url
    ) {
      throw new Error("Сервер не вернул данные шрифта");
    }
    const normalizedFonts: Array<{
      id: string;
      family: string;
      url: string;
      kind: "static" | "variable";
    }> = payload.fonts.map((font) => ({
      ...font,
      url: resolveClientAssetUrl(font.url),
      kind: font.kind === "variable" ? "variable" : "static",
    }));
    setAvailableFonts((prev) => {
      const next = [
        ...normalizedFonts,
        ...prev.filter(
          (x) =>
            !normalizedFonts.some((n) => n.id === x.id) &&
            !normalizedFonts.some((n) => n.kind === "variable" && n.family === x.family),
        ),
      ];
      return next;
    });
    console.info("[fonts] upload result", {
      created: normalizedFonts.length,
      duplicateCount: payload.duplicateCount ?? 0,
      replacedFamily: !!payload.replacedFamily,
      details: payload.details ?? [],
    });
    const duplicateText = payload.duplicateCount
      ? `, пропущено дублей: ${payload.duplicateCount}`
      : "";
    setMessage(
      payload.reused
        ? "Шрифт уже в библиотеке — подключён существующий файл"
        : payload.replacedFamily
          ? `Семейство заменено на вариативный шрифт${duplicateText}`
          : `Шрифты загружены${duplicateText}`,
    );
    const selected = normalizedFonts[0]!;
    return { family: selected.family, url: selected.url };
  }

  const {
    saveSpeakerSettings,
    setSpeakerQuestionOnScreen,
    hideSpeakerQuestion,
    restoreSpeakerQuestion,
    setSpeakerQuestionUserVisible,
    updateSpeakerQuestionText,
    deleteSpeakerQuestion,
  } = useSpeakerQuestionsAdminActions({
    quizId,
    speakerSettings: speakerQuestions.settings,
    setMessage,
  });

  const setSpeakerQuestionOnScreenAndOpenProjector = useCallback(
    (id: string, next: boolean) => {
      setSpeakerQuestionOnScreen(id, next);
      if (next) {
        setPublicResultsViewRef.current("speaker_questions");
      }
    },
    [setSpeakerQuestionOnScreen],
  );

  function updateHighlightedLeaders(nextValue: number) {
    const safe = Number.isFinite(nextValue) ? Math.max(0, Math.min(100, Math.trunc(nextValue))) : 0;
    setHighlightedLeadersCount(safe);
    if (!quizId) return;
    emitPublicViewPatch({ highlightedLeadersCount: safe });
    setMessage(`Подсветка TOP-${safe} сохранена`);
  }

  function resetResultsUiSettings() {
    setLeaderboardSort("place_asc");
    setHighlightedLeadersCount(3);
    setShowFirstCorrectAnswerer(false);
    setFirstCorrectWinnersCount(1);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(resultsUiStorageKey);
    }
    if (quizId) {
      setPublicViewMode("title");
      setPublicViewQuestionId(undefined);
      setQuestionRevealStage("options");
      emitPublicViewSet({
        mode: "title",
        questionRevealStage: "options",
        highlightedLeadersCount: 3,
        showFirstCorrectAnswerer: false,
        firstCorrectWinnersCount: 1,
      });
      setMessage("Настройки отображения результатов сброшены");
      return;
    }
    setPublicViewMode("title");
    setPublicViewQuestionId(undefined);
    setQuestionRevealStage("options");
  }

  function updateFirstCorrectWinnersCount(raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    setFirstCorrectWinnersCount(safe);
    if (!quizId) return;
    emitPublicViewPatch({ firstCorrectWinnersCount: safe });
  }

  const {
    isQuestionDialogOpen,
    questionDialogError,
    setQuestionDialogError,
    newOptionText,
    setNewOptionText,
    tagInputDialogQuestionIndex,
    tagResultsDialogQuestionIndex,
    tagResultsOrder,
    expandedQuestionSettingsIndex,
    setExpandedQuestionSettingsIndex,
    confirmResetQuestionIndex,
    setConfirmResetQuestionIndex,
    confirmResetSubQuizAnswers,
    setConfirmResetSubQuizAnswers,
    confirmDeleteQuestionIndex,
    confirmDeleteSubQuizId,
    defaultRankingQuizHint,
    defaultRankingJuryHint,
    addSubQuizSheet,
    requestRemoveSubQuizSheet,
    closeDeleteSubQuizDialog,
    runConfirmedRemoveSubQuiz,
    addQuestionToSubQuiz,
    cloneQuestionAtIndex,
    requestRemoveQuestion,
    closeDeleteQuestionDialog,
    runConfirmedRemoveQuestion,
    updateQuestion,
    removeOption,
    fillRankingTiersDescending,
    setTagCloudTagPointsAt,
    setRankingTierAt,
    updateOption,
    confirmResetQuestionAnswersByIndex,
    runConfirmedResetQuestionAnswers,
    confirmResetSubQuizAnswersById,
    runConfirmedResetSubQuizAnswers,
    toggleQuestion,
    setPublicResultsView,
    setQuestionRevealStageForQuestion,
    updateQuestionShowVoteCount,
    updateQuestionShowCorrectOption,
    toggleQuestionAdminDone,
    reorderVoteInList,
    updateQuestionProjectorShowFirstCorrect,
    updateQuestionRankingProjectorMetric,
    patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount,
    toggleTagVisibility,
    updateTagCountOverride,
    clearTagCountOverride,
    applyInjectedTagListFromDialog,
    closeTagInputDialog,
    closeTagResultsDialog,
    openQuestionDialog,
    cancelQuestionDialog,
    saveQuestionDialogAndClose,
    commitNewOption,
    openTagInputDialog,
    openTagResultsDialog,
    updateOptionVoteCountOverride,
    clearOptionVoteCountOverride,
    resetOptionVoteCountOverrides,
    togglePlayerVisibleResultQuestionId,
  } = questionEditor;

  const questionsSectionBindings = useMemo(
    () =>
      buildAdminQuestionsSectionSharedBindings({
        eventName,
        expandedQuestionSettingsIndex,
        setExpandedQuestionSettingsIndex,
        questionResults,
        publicViewMode,
        publicViewQuestionId,
        setMessage,
        openQuestionDialog,
        setPublicResultsView,
        updateQuestionShowVoteCount,
        updateQuestionShowCorrectOption,
        openTagInputDialog,
        openTagResultsDialog,
        updateOptionVoteCountOverride,
        clearOptionVoteCountOverride,
        resetOptionVoteCountOverrides,
        confirmResetQuestionAnswersByIndex,
        toggleQuestion,
        updateQuestionProjectorShowFirstCorrect,
        patchQuestionProjectorFirstCorrectWinnersCount,
        commitQuestionProjectorFirstCorrectWinnersCount,
        updateQuestionRankingProjectorMetric,
        showFirstCorrectAnswerer,
        updateShowFirstCorrectAnswerer,
        questionRevealStage,
        setQuestionRevealStageForQuestion,
        playerVisibleResultQuestionIds,
        togglePlayerVisibleResultQuestionId,
      }),
    [
      eventName,
      expandedQuestionSettingsIndex,
      questionResults,
      publicViewMode,
      publicViewQuestionId,
      openQuestionDialog,
      setPublicResultsView,
      updateQuestionShowVoteCount,
      updateQuestionShowCorrectOption,
      openTagInputDialog,
      openTagResultsDialog,
      updateOptionVoteCountOverride,
      clearOptionVoteCountOverride,
      resetOptionVoteCountOverrides,
      confirmResetQuestionAnswersByIndex,
      updateQuestionProjectorShowFirstCorrect,
      patchQuestionProjectorFirstCorrectWinnersCount,
      commitQuestionProjectorFirstCorrectWinnersCount,
      updateQuestionRankingProjectorMetric,
      showFirstCorrectAnswerer,
      updateShowFirstCorrectAnswerer,
      questionRevealStage,
      setQuestionRevealStageForQuestion,
      playerVisibleResultQuestionIds,
      togglePlayerVisibleResultQuestionId,
    ],
  );

  const speakerPanelActions = useMemo(
    () => ({
      onToggleEnabled: speakerQuestions.panelSetters.setEnabled,
      onReactionsTextChange: speakerQuestions.panelSetters.setReactionsText,
      onToggleShowAuthorOnScreen: speakerQuestions.panelSetters.setShowAuthorOnScreen,
      onToggleShowRecipientOnScreen: speakerQuestions.panelSetters.setShowRecipientOnScreen,
      onToggleShowReactionsOnScreen: speakerQuestions.panelSetters.setShowReactionsOnScreen,
      onToggleAllowAllSpeakersTarget: speakerQuestions.panelSetters.setAllowAllSpeakersTarget,
      onSpeakersTextChange: speakerQuestions.panelSetters.setSpeakersText,
      onSaveSettings: saveSpeakerSettings,
    }),
    [speakerQuestions.panelSetters, saveSpeakerSettings],
  );

  const onSelectResultsSubQuiz = useCallback(
    (subQuizId: string) => {
      setResultsSubQuizId(subQuizId);
      if (publicViewMode === "leaderboard" && quizId) {
        emitPublicViewSet({
          mode: "leaderboard",
          leaderboardSubQuizId: subQuizId,
        });
      }
    },
    [publicViewMode, quizId, emitPublicViewSet],
  );

  return (
    <Container maxWidth={false} disableGutters sx={{ p: 0, m: 0, maxWidth: "none" }}>
      <Snackbar
        key={message || "_closed"}
        open={!!message}
        autoHideDuration={ADMIN_BANNER_AUTO_HIDE_MS}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setMessage("");
        }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          top: { xs: "16px !important", sm: "24px !important" },
          zIndex: (theme) => theme.zIndex.snackbar + 150,
        }}
      >
        <Alert
          variant="filled"
          severity={adminBannerSeverity}
          onClose={() => setMessage("")}
          sx={{
            minWidth: { xs: "min(100vw - 32px, 420px)", sm: 380 },
            maxWidth: "min(calc(100vw - 32px), 560px)",
            boxShadow: 3,
            alignItems: "center",
          }}
        >
          {message}
        </Alert>
      </Snackbar>
      {isAuth && room ? (
        <AdminEventStatusBar
          currentPublicScreenText={currentPublicScreenText}
          adminSocketStatus={adminSocketStatus}
          onlineUsersCount={onlineUsersCount}
        />
      ) : null}
      {!authChecked ? null : !isAuth ? (
        <Box
          sx={{
            minHeight: "100dvh",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
          }}
        >
          <AdminLoginForm
            onSuccess={() =>
              checkSession().then((ok) => {
                if (!ok) return;
                setupSocketListeners();
              })
            }
          />
        </Box>
      ) : null}
      {isAuth && room && (
        <Stack direction="row" spacing={0} alignItems="stretch">
          <AdminEventNavSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <Box sx={{ flex: 1, minWidth: 0, mt: 0 }}>
            <Stack spacing={3}>
              <AdminEventSectionRouter
                activeSection={activeSection}
                general={{
                  eventName,
                  editableTitle,
                  setEditableTitle,
                  saveQuizTitle,
                  eventSlug: room.slug,
                  showEventTitleOnPlayer: playerTiles.showEventTitleOnPlayer,
                  onToggleShowEventTitleOnPlayer: playerTiles.updateShowEventTitleOnPlayer,
                  playerAutoJoinRandomNickname: playerTiles.playerAutoJoinRandomNickname,
                  onTogglePlayerAutoJoinRandomNickname:
                    playerTiles.updatePlayerAutoJoinRandomNickname,
                  onRequestResetDemo: () => setConfirmResetDemoOpen(true),
                }}
                questions={{
                  roomQuestionsTab,
                  onRoomQuestionsTabChange: setRoomQuestionsTab,
                  eventName,
                  quizId,
                  onlineUsersCount,
                  eventParticipantNicknames,
                  refreshEventParticipantNicknames,
                  feedbackForms: feedbackCatalog.feedbackForms,
                  setFeedbackForms: feedbackCatalog.setFeedbackForms,
                  syncFeedbackCatalogToReport: feedbackCatalog.syncCatalogToReport,
                  feedbackCatalogLoading: feedbackCatalog.catalogLoading,
                  subQuizSheets,
                  setSubQuizSheets,
                  questionForms,
                  selectedQuestionIndex,
                  expandedSubQuizId,
                  setExpandedSubQuizId,
                  votesIndexMap,
                  activeVoteIndices,
                  doneVoteIndices,
                  activeVotesSelectedListIndex,
                  doneVotesSelectedListIndex,
                  voteListManageMode,
                  setVoteListManageMode,
                  publicViewMode,
                  resultsSubQuizId,
                  firstCorrectWinnersCount,
                  setFirstCorrectWinnersCount,
                  highlightedLeadersCount,
                  setHighlightedLeadersCount,
                  questionsSectionBindings,
                  playerTiles,
                  randomizer,
                  adminReactions,
                  emitPublicViewPatch,
                  setPublicResultsView,
                  addSubQuizSheet,
                  addQuestionToSubQuiz,
                  saveSubQuizTitle: saveSubQuizTitleApi,
                  requestRemoveSubQuizSheet,
                  toggleQuestion,
                  updateFirstCorrectWinnersCount,
                  updateHighlightedLeaders,
                  confirmResetSubQuizAnswersById,
                  toggleQuestionAdminDone,
                  reorderVoteInList,
                  cloneQuestionAtIndex,
                }}
                speakers={{
                  speakerQuestions,
                  panelActions: speakerPanelActions,
                  onHide: hideSpeakerQuestion,
                  onRestore: restoreSpeakerQuestion,
                  onSetUserVisible: setSpeakerQuestionUserVisible,
                  onSetOnScreen: setSpeakerQuestionOnScreenAndOpenProjector,
                  onUpdateQuestionText: updateSpeakerQuestionText,
                  onDeleteQuestion: deleteSpeakerQuestion,
                }}
                banners={{
                  eventName,
                  playerTiles,
                  subQuizzesForReport,
                  brandPrimaryColor: branding.brandPrimaryColor,
                  playerVoteOptionTextColor: branding.playerVoteOptionTextColor,
                  uploadBannerMedia,
                  onUploadError: setMessage,
                }}
                branding={brandingProps}
                results={{
                  leaderboardSort,
                  setLeaderboardSort,
                  displayedLeaderboard,
                  exportLeaderboardCsv,
                  leaderboardsBySubQuiz: leaderboardsBySubQuiz.map((x) => ({
                    subQuizId: x.subQuizId,
                    title: x.title,
                  })),
                  resultsSubQuizId,
                  onSelectResultsSubQuiz,
                }}
                report={{
                  roomSlug: room.slug,
                  adminReport,
                  randomizer,
                  adminReactions,
                  speakerQuestions,
                  availableQuizQuestions,
                  availableVoteQuestions,
                  emitPublicViewPatch,
                  setMessage,
                }}
                danger={{ onResetAllAnswers: resetAllAnswers }}
              />
            </Stack>
          </Box>
        </Stack>
      )}
      {isAuth && !room && <Alert severity="warning">Комната не найдена.</Alert>}
      <AdminEventQuestionOverlays
        questionDialog={{
          open: isQuestionDialogOpen,
          question: questionForms[selectedQuestionIndex],
          dialogError: questionDialogError,
          onDialogError: setQuestionDialogError,
          defaultRankingQuizHint,
          defaultRankingJuryHint,
          newOptionText,
          setNewOptionText,
          onCancel: cancelQuestionDialog,
          onSave: saveQuestionDialogAndClose,
          onRequestRemove: () => requestRemoveQuestion(selectedQuestionIndex),
          onUpdateQuestion: (patch) => updateQuestion(selectedQuestionIndex, patch),
          onUpdateOption: (oIndex, patch) => updateOption(selectedQuestionIndex, oIndex, patch),
          onRemoveOption: (oIndex) => removeOption(selectedQuestionIndex, oIndex),
          onCommitNewOption: commitNewOption,
          onSetTagCloudTagPointsAt: (tagIdx, raw) =>
            setTagCloudTagPointsAt(selectedQuestionIndex, tagIdx, raw),
          onSetRankingTierAt: (rankIdx, raw) =>
            setRankingTierAt(selectedQuestionIndex, rankIdx, raw),
          onFillRankingTiersDescending: () => fillRankingTiersDescending(selectedQuestionIndex),
          uploadBannerMedia,
        }}
        tagCloudDialogs={{
          tagInputQuestionIndex: tagInputDialogQuestionIndex,
          tagResultsQuestionIndex: tagResultsDialogQuestionIndex,
          questionForms,
          onQuestionFormsChange: setQuestionForms,
          questionResults,
          tagResultsOrder,
          onCloseTagInput: closeTagInputDialog,
          onApplyInjectedTagList: applyInjectedTagListFromDialog,
          onCloseTagResults: closeTagResultsDialog,
          onToggleTagVisibility: toggleTagVisibility,
          onUpdateTagCountOverride: updateTagCountOverride,
          onClearTagCountOverride: clearTagCountOverride,
        }}
        confirmDialogs={{
          confirmResetQuestionIndex,
          onCloseResetQuestion: () => setConfirmResetQuestionIndex(null),
          onConfirmResetQuestion: runConfirmedResetQuestionAnswers,
          confirmResetSubQuizAnswers,
          onCloseResetSubQuiz: () => setConfirmResetSubQuizAnswers(null),
          onConfirmResetSubQuiz: runConfirmedResetSubQuizAnswers,
          confirmDeleteSubQuizId,
          onCloseDeleteSubQuiz: closeDeleteSubQuizDialog,
          onConfirmDeleteSubQuiz: runConfirmedRemoveSubQuiz,
          confirmDeleteQuestionIndex,
          onCloseDeleteQuestion: closeDeleteQuestionDialog,
          onConfirmDeleteQuestion: runConfirmedRemoveQuestion,
          confirmResetDemoOpen,
          onCloseResetDemo: () => setConfirmResetDemoOpen(false),
          onConfirmResetDemo: resetDemoToDefault,
        }}
      />
    </Container>
  );
}
