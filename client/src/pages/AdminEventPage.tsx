import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useParams } from "react-router-dom";
import { Alert, Box, Button, Container, Snackbar, Stack, TextField, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { API_BASE } from "../config";
import { randomUuid } from "../utils/randomUuid";
import { buildPlayerJoinUrl, buildProjectorScreenUrl } from "../publicAppOrigin";
import { useAdminPlayerTiles } from "../features/admin/useAdminPlayerTiles";
import { useAdminEventBootstrap } from "../features/admin/useAdminEventBootstrap";
import { useAdminSpeakerQuestions } from "../features/admin/useAdminSpeakerQuestions";
import { useAdminFontLibrary } from "../features/admin/useAdminFontLibrary";
import {
  useAdminRandomizer,
  type AdminSetPublicResultsView,
} from "../features/admin/useAdminRandomizer";
import { useAdminReport } from "../features/admin/useAdminReport";
import { useAdminReactions } from "../features/admin/useAdminReactions";
import { useAdminBrandingVisual } from "../features/admin/useAdminBrandingVisual";
import { buildAdminQuestionsSectionSharedBindings } from "../features/admin/adminQuestionsSectionSharedBindings";
import { AdminEventSectionRouter } from "./adminEvent/AdminEventSectionRouter";
import { AdminEventQuestionOverlays } from "./adminEvent/AdminEventQuestionOverlays";
import { AdminEventStatusBar } from "./adminEvent/AdminEventStatusBar";
import { AdminEventNavSidebar } from "./adminEvent/AdminEventNavSidebar";
import { getCurrentPublicScreenText } from "./adminEvent/adminEventScreenLabel";
import type { PublicViewMode, PublicViewSetPatch } from "../publicViewContract";
import {
  normalizePublicViewState,
  prunePlayerUiRefsForRoom,
  type CloudManualStateByQuestion,
  type PublicBanner,
  type PublicViewPayload,
} from "../publicViewContract";
import {
  buildCloudManualFromQuestions,
  applyCloudManualToQuestions,
  buildTagResultsDisplayOrder,
  clearCountOverrideRow,
  clearQuestionManualFields,
  mergeInjectedTagWords,
  parseInjectedTagLines,
  readCloudManualFromPublicView,
  setTagCountOverrideRow,
  toggleHiddenTagText,
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
  cloneQuestionForm,
  computeFirstIncompleteSubQuizId,
  createEmptyQuestion,
  isEditorQuizMode,
  normalizeTagCloudQuestionPoints,
  validateQuestionFormEntry,
  validateQuestionsForm,
  validateSheetsHaveSubQuizId,
  type AdminEventRoom,
  type OptionForm,
  type QuestionForm,
  type QuestionType,
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
  const defaultRankingQuizHint =
    "Расставьте варианты от лучшего к худшему (первый в списке — лучший).";
  const defaultRankingJuryHint =
    "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется.";
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
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [confirmResetQuestionIndex, setConfirmResetQuestionIndex] = useState<number | null>(null);
  const [confirmResetSubQuizAnswers, setConfirmResetSubQuizAnswers] = useState<{
    subQuizId: string;
    title: string;
  } | null>(null);
  const [confirmDeleteQuestionIndex, setConfirmDeleteQuestionIndex] = useState<number | null>(null);
  const [confirmResetDemoOpen, setConfirmResetDemoOpen] = useState(false);
  const [confirmDeleteSubQuizId, setConfirmDeleteSubQuizId] = useState<string | null>(null);
  const [tagInputDialogQuestionIndex, setTagInputDialogQuestionIndex] = useState<number | null>(
    null,
  );
  const [tagResultsDialogQuestionIndex, setTagResultsDialogQuestionIndex] = useState<number | null>(
    null,
  );
  const [tagResultsOrder, setTagResultsOrder] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [expandedQuestionSettingsIndex, setExpandedQuestionSettingsIndex] = useState<number | null>(
    null,
  );
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
  const [eventParticipantNicknames, setEventParticipantNicknames] = useState<string[]>([]);
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
  /** Ошибка валидации/сети при сохранении из попапа редактора вопроса */
  const [questionDialogError, setQuestionDialogError] = useState("");
  const lastSavedSnapshotRef = useRef("");
  /** Снимок вопросов на момент открытия редактора (отмена восстанавливает) */
  const questionDialogSnapshotRef = useRef<QuestionForm[] | null>(null);
  /** В каком подквизе открыт редактор вопроса — задаётся при открытии, после сохранения по нему раскрываем аккордеон. */
  const questionDialogTargetSubQuizIdRef = useRef<string | null>(null);
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
    questionDialogTargetSubQuizIdRef.current = null;
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

  useAdminEventBootstrap({
    eventName,
    isAuth,
    checkSession,
    loadRoom,
    loadFontLibrary,
    setEventParticipantNicknames,
    setAvailableFeedbackForms: adminReport.setAvailableFeedbackForms,
    setReportFeedbackFormIds: adminReport.setReportFeedbackFormIds,
    emitPublicViewPatch: (patch) => emitPublicViewPatchRef.current(patch),
  });

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

  useEffect(() => {
    setNewOptionText("");
  }, [isQuestionDialogOpen, selectedQuestionIndex]);

  useEffect(() => {
    if (!isQuestionDialogOpen) return;
    setQuestionDialogError("");
  }, [questionForms, isQuestionDialogOpen]);

  /** Вопросы квиза на листе всегда в режиме квиза; переключатель в диалоге только у голосований комнаты. */
  useEffect(() => {
    if (!isQuestionDialogOpen) return;
    setQuestionForms((prev) => {
      const q = prev[selectedQuestionIndex];
      if (!q) return prev;
      if (q.subQuizId == null && q.type === "tag_cloud") {
        if (q.editorQuizMode && q.options.length >= 2) return prev;
        const hasCorrect = q.options.some((o) => o.isCorrect);
        return prev.map((qq, i) =>
          i !== selectedQuestionIndex
            ? qq
            : {
                ...qq,
                editorQuizMode: true,
                options:
                  qq.options.length >= 2
                    ? hasCorrect
                      ? qq.options
                      : qq.options.map((o, oi) => ({ ...o, isCorrect: oi === 0 }))
                    : [
                        { text: "", isCorrect: true },
                        { text: "", isCorrect: false },
                      ],
              },
        );
      }
      if (q.subQuizId == null) return prev;
      if (q.type === "tag_cloud") {
        return prev.map((qq, i) =>
          i !== selectedQuestionIndex
            ? qq
            : normalizeTagCloudQuestionPoints({ ...qq, editorQuizMode: true }),
        );
      }
      if (q.editorQuizMode) return prev;
      const hasCorrect = q.options.some((o) => o.isCorrect);
      return prev.map((qq, i) =>
        i !== selectedQuestionIndex
          ? qq
          : {
              ...qq,
              editorQuizMode: true,
              options: hasCorrect
                ? qq.options
                : qq.options.map((o, oi) => ({ ...o, isCorrect: oi === 0 })),
            },
      );
    });
  }, [isQuestionDialogOpen, selectedQuestionIndex]);

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

  function cloneQuestionForms(forms: QuestionForm[]): QuestionForm[] {
    return JSON.parse(JSON.stringify(forms)) as QuestionForm[];
  }

  function addSubQuizSheet() {
    const id = `new-${randomUuid()}`;
    setSubQuizSheets((prev) => {
      const next = [...prev, { id, title: "Новый квиз", questionFlowMode: "manual" as const }];
      syncedSubQuizIdsKeyRef.current = [...next]
        .map((s) => s.id)
        .sort()
        .join(",");
      return next;
    });
    setExpandedSubQuizId(id);
    setRoomQuestionsTab("quizzes");
  }

  async function removeSubQuizSheet(sqId: string) {
    console.info("[admin][subquiz-delete] requested", {
      subQuizId: sqId,
      hasWindow: typeof window !== "undefined",
    });
    console.info("[admin][subquiz-delete] applying delete", { subQuizId: sqId });
    const nextSheets = subQuizSheets.filter((s) => s.id !== sqId);
    const nextForms = questionForms.filter((q) => q.subQuizId !== sqId);
    const formErr = validateQuestionsForm(nextForms);
    if (formErr) {
      setMessage(formErr);
      return;
    }
    const sheetErr = validateSheetsHaveSubQuizId(nextSheets, nextForms);
    if (sheetErr) {
      setMessage(sheetErr);
      return;
    }
    const prevSelectedId = questionForms[selectedQuestionIndex]?.id;
    if (isQuestionDialogOpen && questionForms[selectedQuestionIndex]?.subQuizId === sqId) {
      questionDialogSnapshotRef.current = null;
      questionDialogTargetSubQuizIdRef.current = null;
      closeQuestionDialog();
    }
    setSubQuizSheets(nextSheets);
    setQuestionForms(nextForms);
    setSelectedQuestionIndex(() => {
      if (nextForms.length === 0) return 0;
      if (prevSelectedId) {
        const ni = nextForms.findIndex((q) => q.id === prevSelectedId);
        if (ni >= 0) return ni;
      }
      return 0;
    });
    const persisted = await persistQuestions(nextForms, nextSheets);
    if (persisted !== false) {
      const validSubQuizIds = new Set(nextSheets.map((s) => s.id));
      const validQuestionIds = new Set(
        nextForms
          .map((q) => q.id)
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      );
      const prunedPlayerUi = prunePlayerUiRefsForRoom(
        {
          playerQuizResultsSubQuizIds: playerTiles.playerQuizResultsSubQuizIds,
          playerQuizResultsSubQuizId: playerTiles.playerQuizResultsSubQuizId,
          playerQuizResultsTileVisible: playerTiles.playerQuizResultsTileVisible,
          playerTilesOrder: playerTiles.playerTilesOrder,
          playerVisibleResultQuestionIds,
          leaderboardSubQuizId: resultsSubQuizId,
          reportVoteQuestionIds: adminReport.reportVoteQuestionIds,
          reportQuizQuestionIds: adminReport.reportQuizQuestionIds,
          reportQuizSubQuizIds: adminReport.reportQuizSubQuizIds,
        },
        validSubQuizIds,
        validQuestionIds,
      );
      const nextTilesOrder = playerTiles.applyPrunedPlayerUi(prunedPlayerUi);
      setPlayerVisibleResultQuestionIds(prunedPlayerUi.playerVisibleResultQuestionIds);
      if (resultsSubQuizId !== prunedPlayerUi.leaderboardSubQuizId) {
        setResultsSubQuizId(prunedPlayerUi.leaderboardSubQuizId);
      }
      adminReport.applyPrunedRefs({
        reportVoteQuestionIds: prunedPlayerUi.reportVoteQuestionIds,
        reportQuizQuestionIds: prunedPlayerUi.reportQuizQuestionIds,
        reportQuizSubQuizIds: prunedPlayerUi.reportQuizSubQuizIds,
      });
      emitPublicViewSet({
        ...prunedPlayerUi,
        playerTilesOrder: nextTilesOrder,
      });
      setMessage("Квиз удалён");
      if (nextForms.length === 0) setQuestionId("");
    }
  }

  function requestRemoveSubQuizSheet(sqId: string) {
    console.info("[admin][subquiz-delete] open-confirm-dialog", { subQuizId: sqId });
    setConfirmDeleteSubQuizId(sqId);
  }

  function closeDeleteSubQuizDialog() {
    setConfirmDeleteSubQuizId(null);
  }

  async function runConfirmedRemoveSubQuiz() {
    if (!confirmDeleteSubQuizId) return;
    const sqId = confirmDeleteSubQuizId;
    closeDeleteSubQuizDialog();
    await removeSubQuizSheet(sqId);
  }

  function addQuestionToSubQuiz(sqId: string | null) {
    setQuestionDialogError("");
    questionDialogTargetSubQuizIdRef.current = sqId;
    if (sqId) {
      pinExpandedSubQuiz(sqId);
    }
    questionDialogSnapshotRef.current = cloneQuestionForms(questionForms);
    const newQ = createEmptyQuestion(sqId);
    if (sqId == null) {
      newQ.editorQuizMode = false;
      newQ.options = newQ.options.map((opt) => ({ ...opt, isCorrect: false }));
    }
    setQuestionForms((prev) => {
      let insertAt = prev.length;
      if (sqId !== null) {
        let last = -1;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].subQuizId === sqId) last = i;
        }
        insertAt = last === -1 ? prev.length : last + 1;
      } else {
        let last = -1;
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].subQuizId == null) last = i;
        }
        insertAt = last === -1 ? prev.length : last + 1;
      }
      const next = [...prev];
      next.splice(insertAt, 0, newQ);
      setSelectedQuestionIndex(insertAt);
      setIsQuestionDialogOpen(true);
      return next;
    });
  }

  async function cloneQuestionAtIndex(globalIndex: number) {
    const source = questionForms[globalIndex];
    if (!source) return;
    if (!source.id) {
      setMessage("Сначала сохраните голосование");
      return;
    }
    const prevIds = new Set(
      questionForms.map((q) => q.id).filter((id): id is string => Boolean(id)),
    );
    const cloned = cloneQuestionForm(source);
    const insertAt = globalIndex + 1;
    const next = [...questionForms];
    next.splice(insertAt, 0, cloned);
    const formErr = validateQuestionsForm(next);
    if (formErr) {
      setMessage(formErr);
      return;
    }
    setQuestionForms(next);
    const merged = await persistQuestions(next, subQuizSheets, { suppressToast: true });
    if (merged === false) {
      setQuestionForms(questionForms);
      return;
    }
    const newIndex = merged.questions.findIndex((q) => q.id && !prevIds.has(q.id));
    const targetIndex = newIndex >= 0 ? newIndex : insertAt;
    setSelectedQuestionIndex(targetIndex);
    questionDialogSnapshotRef.current = cloneQuestionForms(merged.questions);
    questionDialogTargetSubQuizIdRef.current = source.subQuizId ?? null;
    setIsQuestionDialogOpen(true);
    setMessage("Голосование скопировано");
  }

  async function removeQuestion(index: number) {
    const removed = questionForms[index];
    const subQuizIdForAccordion =
      removed?.subQuizId != null && removed.subQuizId !== "" ? removed.subQuizId : null;
    const next = questionForms.filter((_, i) => i !== index);
    const err = validateQuestionsForm(next);
    if (err) {
      setQuestionDialogError(err);
      return;
    }
    setQuestionForms(next);
    setSelectedQuestionIndex((current) => {
      if (next.length === 0) return 0;
      if (index < current) return current - 1;
      if (index === current) return Math.max(0, current - 1);
      return current;
    });
    questionDialogSnapshotRef.current = null;
    questionDialogTargetSubQuizIdRef.current = null;
    closeQuestionDialog();
    const persisted = await persistQuestions(next, subQuizSheets);
    if (persisted !== false) {
      setMessage("Вопросы сохранены");
      if (next.length === 0) setQuestionId("");
      if (subQuizIdForAccordion) {
        pinExpandedSubQuiz(subQuizIdForAccordion);
      }
    }
  }

  function requestRemoveQuestion(index: number) {
    setConfirmDeleteQuestionIndex(index);
  }

  function closeDeleteQuestionDialog() {
    setConfirmDeleteQuestionIndex(null);
  }

  async function runConfirmedRemoveQuestion() {
    if (confirmDeleteQuestionIndex === null) return;
    const index = confirmDeleteQuestionIndex;
    closeDeleteQuestionDialog();
    await removeQuestion(index);
  }

  function updateQuestion(index: number, patch: Partial<QuestionForm>) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const next = { ...q, ...patch };
        if (patch.type === "tag_cloud") {
          next.editorQuizMode = true;
          if (next.options.length < 2) {
            next.options = [
              { text: "", isCorrect: true },
              { text: "", isCorrect: false },
            ];
          }
          if (isEditorQuizMode(next)) {
            return normalizeTagCloudQuestionPoints(next);
          }
          if (!next.options.some((o) => o.isCorrect)) {
            next.options = next.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
          }
        } else if (patch.type === "ranking") {
          next.editorQuizMode = true;
          next.rankingKind = next.rankingKind ?? "jury";
          if (!next.rankingPlayerHint?.trim()) {
            next.rankingPlayerHint =
              next.rankingKind === "quiz" ? defaultRankingQuizHint : defaultRankingJuryHint;
          }
          if (next.rankingProjectorMetric == null) {
            next.rankingProjectorMetric = "avg_score";
          }
          if (next.options.length < 3) {
            const pad = 3 - next.options.length;
            next.options = [
              ...next.options,
              ...Array.from({ length: pad }, () => ({ text: "", isCorrect: false })),
            ];
          }
          {
            const n = next.options.length;
            next.rankingPointsByRank =
              next.rankingKind === "jury"
                ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
                : Array.from({ length: n }, (_, j) => j + 1);
          }
        } else if (patch.type === "single" || patch.type === "multi") {
          if (q.type === "tag_cloud") {
            next.editorQuizMode = true;
            if (next.options.length > 0 && !next.options.some((o) => o.isCorrect)) {
              next.options = next.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
            }
          }
        } else if (patch.type === "temperature") {
          next.editorQuizMode = false;
          if (next.options.length < 2) {
            next.options = DEFAULT_TEMPERATURE_OPTION_WEIGHTS.map((weight) => ({
              text: "",
              isCorrect: false,
              weight,
            }));
          } else {
            next.options = next.options.map((o, idx) => ({
              ...o,
              isCorrect: false,
              weight: o.weight ?? DEFAULT_TEMPERATURE_OPTION_WEIGHTS[idx] ?? 50,
            }));
          }
        }
        if (patch.type === "single" && isEditorQuizMode(next)) {
          let firstCorrect = next.options.findIndex((o) => o.isCorrect);
          if (firstCorrect === -1 && next.options.length > 0) {
            firstCorrect = 0;
          }
          next.options = next.options.map((o, optIdx) => ({
            ...o,
            isCorrect: optIdx === firstCorrect && firstCorrect !== -1,
          }));
        }
        return next;
      }),
    );
  }

  function addOption(questionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const nextOpts = [
          ...q.options,
          { text: "", isCorrect: q.type === "tag_cloud" && isEditorQuizMode(q) },
        ];
        if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
          const n = nextOpts.length;
          const base = [...(q.rankingPointsByRank ?? []), 1];
          while (base.length < n) base.push(1);
          return { ...q, options: nextOpts, rankingPointsByRank: base.slice(0, n) };
        }
        if (q.type !== "ranking") return { ...q, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...q,
          options: nextOpts,
          rankingPointsByRank:
            q.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const minOpts =
          q.type === "tag_cloud" && isEditorQuizMode(q) ? 1 : q.type === "ranking" ? 3 : 2;
        if (q.options.length <= minOpts) return q;
        const nextOpts = q.options.filter((_, oi) => oi !== optionIndex);
        if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
          const base = (q.rankingPointsByRank ?? []).filter((_, oi) => oi !== optionIndex);
          return { ...q, options: nextOpts, rankingPointsByRank: base };
        }
        if (q.type !== "ranking") return { ...q, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...q,
          options: nextOpts,
          rankingPointsByRank:
            q.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
  }

  function fillRankingTiersDescending(questionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "ranking") return q;
        const n = q.options.length;
        return {
          ...q,
          rankingPointsByRank: Array.from({ length: n }, (_, j) => Math.max(1, n - j)),
        };
      }),
    );
  }

  function setTagCloudTagPointsAt(questionIndex: number, tagIdx: number, raw: string) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "tag_cloud" || !isEditorQuizMode(q)) return q;
        const n = q.options.length;
        const base = [...(q.rankingPointsByRank ?? Array.from({ length: n }, () => 1))];
        while (base.length < n) base.push(1);
        const v =
          raw.trim() === "" ? 1 : Math.min(10_000, Math.max(0, Math.trunc(Number(raw)) || 0));
        base[tagIdx] = v;
        return { ...q, rankingPointsByRank: base };
      }),
    );
  }

  function setRankingTierAt(questionIndex: number, rankIdx: number, raw: string) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.type !== "ranking") return q;
        const n = q.options.length;
        const base = [
          ...(q.rankingPointsByRank ??
            Array.from({ length: n }, () => (q.rankingKind === "jury" ? 0 : 1))),
        ];
        while (base.length < n) base.push(0);
        const v =
          raw.trim() === ""
            ? q.rankingKind === "jury"
              ? 0
              : 1
            : q.rankingKind === "jury"
              ? Math.min(10_000, Math.max(0, Math.trunc(Number(raw)) || 0))
              : Math.min(n, Math.max(1, Math.trunc(Number(raw)) || 1));
        base[rankIdx] = v;
        if (q.rankingKind === "jury") {
          const allZero = base.every((x) => x === 0);
          return { ...q, rankingPointsByRank: allZero ? null : base };
        }
        return { ...q, rankingPointsByRank: base };
      }),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<OptionForm>) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const nextOptions = q.options.map((o, oi) => {
          if (oi !== optionIndex) return o;
          return { ...o, ...patch };
        });
        if (q.type === "single" && patch.isCorrect) {
          return {
            ...q,
            options: nextOptions.map((o, oi) => ({ ...o, isCorrect: oi === optionIndex })),
          };
        }
        if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
          return {
            ...q,
            options: nextOptions.map((o) =>
              o.text.trim() ? { ...o, isCorrect: true } : { ...o, isCorrect: false },
            ),
          };
        }
        return { ...q, options: nextOptions };
      }),
    );
  }

  function resetQuestionAnswersByIndex(index: number) {
    const question = questionForms[index];
    if (!quizId || !question?.id) {
      setMessage("Сначала сохраните вопросы, чтобы сбрасывать ответы");
      return;
    }
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) => (idx === index ? clearQuestionManualFields(q) : q));
      void persistCloudManualSnapshot(next);
      return next;
    });
    socket.emit("admin:answers:reset-question", {
      quizId,
      questionId: question.id,
    });
    setMessage("Ответы и ручные правки по выбранному вопросу обнулены");
  }

  function confirmResetQuestionAnswersByIndex(index: number) {
    setConfirmResetQuestionIndex(index);
  }

  function runConfirmedResetQuestionAnswers() {
    if (confirmResetQuestionIndex === null) return;
    const index = confirmResetQuestionIndex;
    setConfirmResetQuestionIndex(null);
    resetQuestionAnswersByIndex(index);
  }

  function resetAllAnswers() {
    if (!quizId) return;
    socket.emit("admin:answers:reset-all", { quizId });
    setMessage("Все ответы и ручные правки результатов в комнате обнулены");
  }

  function confirmResetSubQuizAnswersById(subQuizId: string, title: string) {
    setConfirmResetSubQuizAnswers({ subQuizId, title });
  }

  function runConfirmedResetSubQuizAnswers() {
    if (!quizId || !confirmResetSubQuizAnswers) return;
    const { subQuizId, title } = confirmResetSubQuizAnswers;
    setConfirmResetSubQuizAnswers(null);
    socket.emit("admin:answers:reset-sub-quiz", { quizId, subQuizId });
    setMessage(`Ответы и ручные правки по квизу «${title}» обнулены`);
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

  function toggleQuestion(questionIndex: number, enabled: boolean) {
    const question = questionForms[questionIndex];
    if (!quizId || !question?.id) {
      setMessage("Сначала сохраните вопросы, чтобы управлять их запуском");
      return;
    }
    socket.emit("question:toggle", {
      quizId,
      questionId: question.id,
      enabled,
    });
    if (enabled) {
      setQuestionId(question.id);
      setQuestionForms((prev) =>
        prev.map((q, idx) => ({
          ...q,
          isActive: idx === questionIndex,
        })),
      );
    } else {
      setQuestionForms((prev) =>
        prev.map((q, idx) => ({
          ...q,
          isActive: idx === questionIndex ? false : q.isActive,
        })),
      );
    }
  }

  const setPublicResultsView = useCallback(
    (
      mode: "title" | "question" | "leaderboard" | "speaker_questions" | "reactions" | "randomizer",
      questionIdForMode?: string,
      extraPatch?: PublicViewSetPatch,
    ) => {
      if (!quizId) {
        setMessage("Quiz ID не найден");
        return;
      }
      const nextQuestionId = mode === "question" ? questionIdForMode : undefined;
      if (mode === "question" && !nextQuestionId) {
        setMessage("Не выбран вопрос для экрана");
        return;
      }
      const targetQuestion =
        mode === "question" && nextQuestionId
          ? questionForms.find((q) => q.id === nextQuestionId)
          : undefined;
      const nextQuestionRevealStage =
        mode === "question" && targetQuestion?.type !== "tag_cloud" ? "options" : "results";
      const leaderboardSubQuizIdForEmit =
        mode === "leaderboard"
          ? (extraPatch?.leaderboardSubQuizId ?? resultsSubQuizId ?? "").trim() || undefined
          : undefined;
      if (mode === "leaderboard" && leaderboardSubQuizIdForEmit) {
        setResultsSubQuizId(leaderboardSubQuizIdForEmit);
      }
      setShowFirstCorrectAnswerer(false);
      setPublicViewMode(mode);
      setPublicViewQuestionId(nextQuestionId);
      setQuestionRevealStage(nextQuestionRevealStage);
      emitPublicViewSet({
        mode,
        questionId: nextQuestionId,
        questionRevealStage: nextQuestionRevealStage,
        showCorrectOption: targetQuestion?.showCorrectOption ?? false,
        showFirstCorrectAnswerer: false,
        ...(leaderboardSubQuizIdForEmit
          ? { leaderboardSubQuizId: leaderboardSubQuizIdForEmit }
          : {}),
        ...extraPatch,
      });
    },
    [emitPublicViewSet, questionForms, quizId, resultsSubQuizId],
  );
  setPublicResultsViewRef.current = setPublicResultsView;

  function setQuestionRevealStageForQuestion(
    questionIdForProjector: string,
    stage: "options" | "results",
  ) {
    if (!quizId) {
      setMessage("Quiz ID не найден");
      return;
    }
    setPublicViewMode("question");
    setPublicViewQuestionId(questionIdForProjector);
    setQuestionRevealStage(stage);
    emitPublicViewSet({
      mode: "question",
      questionId: questionIdForProjector,
      questionRevealStage: stage,
      showFirstCorrectAnswerer: false,
    });
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
        setPublicResultsView("speaker_questions");
      }
    },
    [setPublicResultsView, setSpeakerQuestionOnScreen],
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

  function updateShowFirstCorrectAnswerer(next: boolean, questionIdForProjector?: string) {
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
  }

  function updateFirstCorrectWinnersCount(raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    setFirstCorrectWinnersCount(safe);
    if (!quizId) return;
    emitPublicViewPatch({ firstCorrectWinnersCount: safe });
  }

  function togglePlayerVisibleResultQuestionId(questionIdForTile: string) {
    setPlayerVisibleResultQuestionIds((prev) => {
      const next = prev.includes(questionIdForTile)
        ? prev.filter((x) => x !== questionIdForTile)
        : [...prev, questionIdForTile];
      emitPublicViewPatch({ playerVisibleResultQuestionIds: next });
      return next;
    });
  }

  function updateQuestionShowVoteCount(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showVoteCount: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: next,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowCorrectOption(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showCorrectOption: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      showCorrectOption: next,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowTitle(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showQuestionTitle: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (
      !quizId ||
      publicViewMode !== "question" ||
      !question?.id ||
      publicViewQuestionId !== question.id
    )
      return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: next,
    });
  }

  async function toggleQuestionAdminDone(globalIndex: number) {
    const prev = questionForms[globalIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    const nextDone = !prev.adminDone;
    const nextForms = questionForms.map((q, idx) =>
      idx === globalIndex ? { ...q, adminDone: nextDone } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionAdminDone(prev.id, nextDone, subQuizSheets, nextForms, quizId);
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) => (idx === globalIndex ? { ...q, adminDone: prev.adminDone } : q)),
      );
    }
  }

  async function reorderVoteInList(
    fromLocalIndex: number,
    toLocalIndex: number,
    scopeIndices: number[],
  ) {
    if (fromLocalIndex === toLocalIndex) return;
    if (
      fromLocalIndex < 0 ||
      toLocalIndex < 0 ||
      fromLocalIndex >= scopeIndices.length ||
      toLocalIndex >= scopeIndices.length
    ) {
      return;
    }

    const orderedGlobals = [...scopeIndices];
    const [removed] = orderedGlobals.splice(fromLocalIndex, 1);
    if (removed === undefined) return;
    orderedGlobals.splice(toLocalIndex, 0, removed);

    const scopePositions = [...scopeIndices].sort((a, b) => a - b);
    const reorderedQuestions = orderedGlobals.map((globalIndex) => questionForms[globalIndex]!);

    const snapshot = questionForms;
    const next = [...questionForms];
    scopePositions.forEach((position, index) => {
      next[position] = reorderedQuestions[index]!;
    });
    setQuestionForms(next);

    const merged = await persistQuestions(next, subQuizSheets, { suppressToast: true });
    if (!merged) {
      setQuestionForms(snapshot);
      setMessage("Не удалось изменить порядок");
    }
  }

  async function updateQuestionProjectorShowFirstCorrect(questionIndex: number, next: boolean) {
    const prev = questionForms[questionIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    const previousSwitch = prev.projectorShowFirstCorrect ?? true;
    const nextForms = questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, projectorShowFirstCorrect: next } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionProjectorSettings(
      prev.id,
      { projectorShowFirstCorrect: next },
      subQuizSheets,
      nextForms,
      quizId,
    );
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, projectorShowFirstCorrect: previousSwitch } : q,
        ),
      );
    }
  }

  async function updateQuestionRankingProjectorMetric(
    questionIndex: number,
    value: "avg_rank" | "avg_score" | "total_score",
  ) {
    const prev = questionForms[questionIndex];
    if (!prev?.id) {
      setMessage("Сначала сохраните вопрос");
      return;
    }
    if (prev.type !== "ranking") return;
    const previousMetric = prev.rankingProjectorMetric ?? "avg_score";
    const nextForms = questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, rankingProjectorMetric: value } : q,
    );
    setQuestionForms(nextForms);
    const ok = await patchQuestionProjectorSettings(
      prev.id,
      { rankingProjectorMetric: value },
      subQuizSheets,
      nextForms,
      quizId,
    );
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, rankingProjectorMetric: previousMetric } : q,
        ),
      );
    }
  }

  function patchQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, next: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(next) ? next : 1)));
    setQuestionForms((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      ),
    );
  }

  function commitQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    setQuestionForms((prev) => {
      const previousCount = prev[questionIndex]?.projectorFirstCorrectWinnersCount ?? 1;
      const qid = prev[questionIndex]?.id;
      const nextForms = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      );
      queueMicrotask(() => {
        void (async () => {
          if (!qid) {
            setMessage("Сначала сохраните вопрос");
            setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
            return;
          }
          const ok = await patchQuestionProjectorSettings(
            qid,
            { projectorFirstCorrectWinnersCount: safe },
            subQuizSheets,
            nextForms,
            quizId,
          );
          if (!ok) {
            setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
          }
        })();
      });
      return nextForms;
    });
  }

  function toggleTagVisibility(questionIndex: number, tagText: string) {
    const question = questionForms[questionIndex];
    const nextHidden = toggleHiddenTagText(question.hiddenTagTexts ?? [], tagText);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, hiddenTagTexts: nextHidden } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function applyInjectedTagList(questionIndex: number) {
    const question = questionForms[questionIndex];
    const parsed = parseInjectedTagLines(question.injectedTagsInput ?? "");
    if (parsed.length === 0) {
      setMessage("Список пустой или формат неверный. Используйте строки вида: слово 10");
      return;
    }
    const nextWords = mergeInjectedTagWords(question.injectedTagWords ?? [], parsed);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, injectedTagWords: nextWords, injectedTagsInput: "" } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
    setMessage("Список ответов добавлен");
  }

  function updateTagCountOverride(questionIndex: number, tagText: string, nextCount: number) {
    const question = questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(
      question.tagCountOverrides ?? [],
      tagText,
      nextCount,
    );
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearTagCountOverride(questionIndex: number, tagText: string) {
    const question = questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.tagCountOverrides ?? [], tagText);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function updateOptionVoteCountOverride(
    questionIndex: number,
    optionId: string,
    nextCount: number,
  ) {
    const question = questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(
      question.optionVoteCountOverrides ?? [],
      optionId,
      nextCount,
    );
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearOptionVoteCountOverride(questionIndex: number, optionId: string) {
    const question = questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.optionVoteCountOverrides ?? [], optionId);
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function resetOptionVoteCountOverrides(questionIndex: number) {
    setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: [] } : q,
      );
      persistCloudManualSnapshot(next);
      return next;
    });
  }

  function openTagInputDialog(questionIndex: number) {
    setTagInputDialogQuestionIndex(questionIndex);
  }

  function closeTagInputDialog() {
    setTagInputDialogQuestionIndex(null);
  }

  function applyInjectedTagListFromDialog() {
    if (tagInputDialogQuestionIndex === null) return;
    applyInjectedTagList(tagInputDialogQuestionIndex);
    closeTagInputDialog();
  }

  function openTagResultsDialog(questionIndex: number) {
    const question = questionForms[questionIndex];
    const result = question?.id
      ? questionResults.find((item) => item.questionId === question.id)
      : undefined;
    const tags = result?.tagCloud ?? [];
    const injected = question?.injectedTagWords ?? [];
    const overrides = question?.tagCountOverrides ?? [];
    setTagResultsOrder(buildTagResultsDisplayOrder({ liveTags: tags, injected, overrides }));
    setTagResultsDialogQuestionIndex(questionIndex);
  }

  function closeTagResultsDialog() {
    setTagResultsDialogQuestionIndex(null);
    setTagResultsOrder([]);
  }

  function openQuestionDialog(index: number) {
    setQuestionDialogError("");
    setQuestionForms((prev) => {
      const next = prev.map((item, i) =>
        i === index && item.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(item) : item,
      );
      questionDialogSnapshotRef.current = cloneQuestionForms(next);
      return next;
    });
    const q = questionForms[index];
    const sid = q?.subQuizId;
    questionDialogTargetSubQuizIdRef.current =
      sid != null && String(sid).trim() !== "" ? String(sid) : null;
    setSelectedQuestionIndex(index);
    setIsQuestionDialogOpen(true);
  }

  function closeQuestionDialog() {
    setIsQuestionDialogOpen(false);
  }

  function cancelQuestionDialog() {
    setQuestionDialogError("");
    questionDialogTargetSubQuizIdRef.current = null;
    if (questionDialogSnapshotRef.current) {
      setQuestionForms(questionDialogSnapshotRef.current);
      questionDialogSnapshotRef.current = null;
    }
    closeQuestionDialog();
  }

  async function saveQuestionDialogAndClose() {
    const idx = selectedQuestionIndex;
    const current = questionForms[idx];
    const formsForSave = questionForms.map((q) =>
      q.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(q) : q,
    );
    const listErr = validateQuestionsForm(formsForSave);
    if (listErr) {
      setQuestionDialogError(listErr);
      return;
    }
    if (formsForSave.some((q, i) => q !== questionForms[i])) {
      setQuestionForms(formsForSave);
    }
    questionDialogSnapshotRef.current = null;
    const merged = await persistQuestions(formsForSave, subQuizSheets, {
      suppressToast: true,
    });
    if (merged === false) {
      setQuestionDialogError(
        lastPersistQuestionsErrorRef.current ??
          "Не удалось сохранить вопросы. Проверьте соединение и попробуйте ещё раз.",
      );
      return;
    }
    setQuestionDialogError("");
    setMessage("Вопросы сохранены");
    questionDialogTargetSubQuizIdRef.current = null;

    /** subQuizId из ответа сервера после merge — id подквиза мог смениться (new-* → cuid), до сохранения нельзя полагаться на ref. */
    const mq = merged.questions;
    let targetSubQuizId: string | null = null;
    if (current?.id) {
      const hit = mq.find((q) => q.id === current.id);
      if (hit?.subQuizId != null && String(hit.subQuizId).trim() !== "") {
        targetSubQuizId = String(hit.subQuizId);
      }
    }
    if (targetSubQuizId == null && idx >= 0 && idx < mq.length) {
      const at = mq[idx];
      if (at?.subQuizId != null && String(at.subQuizId).trim() !== "") {
        targetSubQuizId = String(at.subQuizId);
      }
    }
    if (targetSubQuizId) {
      pinExpandedSubQuiz(targetSubQuizId);
    }
    closeQuestionDialog();
  }

  function commitNewOption() {
    const value = newOptionText.trim();
    if (!value) return;
    setQuestionForms((prev) =>
      prev.map((question, index) => {
        if (index !== selectedQuestionIndex) return question;
        const nextOpts = [
          ...question.options,
          {
            text: value,
            isCorrect: question.type === "tag_cloud" && isEditorQuizMode(question),
          },
        ];
        if (question.type === "tag_cloud" && isEditorQuizMode(question)) {
          const n = nextOpts.length;
          const base = [...(question.rankingPointsByRank ?? []), 1];
          while (base.length < n) base.push(1);
          return { ...question, options: nextOpts, rankingPointsByRank: base.slice(0, n) };
        }
        if (question.type !== "ranking") return { ...question, options: nextOpts };
        const n = nextOpts.length;
        return {
          ...question,
          options: nextOpts,
          rankingPointsByRank:
            question.rankingKind === "jury"
              ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
              : Array.from({ length: n }, (_, j) => j + 1),
        };
      }),
    );
    setNewOptionText("");
  }

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
                void loadRoom();
                void loadFontLibrary();
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
                  onRequestResetDemo: () => setConfirmResetDemoOpen(true),
                }}
                questions={{
                  roomQuestionsTab,
                  onRoomQuestionsTabChange: setRoomQuestionsTab,
                  eventName,
                  quizId,
                  onlineUsersCount,
                  eventParticipantNicknames,
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
