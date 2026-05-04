import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import QuizIcon from "@mui/icons-material/Quiz";
import InsightsIcon from "@mui/icons-material/Insights";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import RemoveIcon from "@mui/icons-material/Remove";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionIcon from "@mui/icons-material/Description";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";
import { AdminGeneralSection } from "../components/admin/AdminGeneralSection";
import {
  AdminReactionsSection,
  type ReactionWidget,
} from "../components/admin/AdminReactionsSection";
import { AdminRandomizerSection } from "../components/admin/AdminRandomizerSection";
import { AdminReportSection } from "../components/admin/AdminReportSection";
import { AdminQuestionsSection } from "../components/admin/AdminQuestionsSection";
import { AdminResultsSection } from "../components/admin/AdminResultsSection";
import { AdminSpeakersSection } from "../components/admin/AdminSpeakersSection";
import { AdminBannersSection } from "../components/admin/AdminBannersSection";
import { SubQuizControlsCard } from "../components/admin/SubQuizControlsCard";
import { API_BASE, APP_ORIGIN } from "../config";
import {
  applySpeakerQuestionsAdminFieldsFromPublicView,
  applySpeakerQuestionsScreenVisibilityFromView,
} from "../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import {
  PROGRAM_TILE_ID,
  SPEAKER_TILE_ID,
  normalizePublicViewState,
  toBrandingState,
  type CloudManualStateByQuestion,
  type PublicReactionWidgetStats,
  type PublicBanner,
  type ReportModuleId,
  type PublicViewPayload,
  type PublicViewSetPatch,
  type PublicViewMode,
} from "../publicViewContract";
import {
  buildTagResultsDisplayOrder,
  mergeInjectedTagWords,
  parseInjectedTagLines,
  setTagCountOverrideRow,
  toggleHiddenTagText,
} from "../features/tagCloudAdmin";
import { useAdminEventSocket } from "../hooks/useAdminEventSocket";
import { useAdminEventApi } from "../hooks/useAdminEventApi";
import { usePublicViewEmitter } from "../hooks/usePublicViewEmitter";
import { useSpeakerQuestionsAdminActions } from "../hooks/useSpeakerQuestionsAdminActions";
import { socket } from "../socket";
import { getStringArrayOrNull } from "../utils/unknownGuards";
import {
  buildQuestionIndexMapForSubQuiz,
  computeFirstIncompleteSubQuizId,
  createEmptyQuestion,
  isEditorQuizMode,
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
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import type { ReactionSession } from "./quiz-play/types";
import { parseApiErrorMessage } from "../utils/apiError";
import { patchQuestionsFromPublicView } from "../features/publicView/patchQuestionFromPublicView";
import {
  getRandomizerPool,
  makeRandomizerTimestamp,
  pickRandomWinners,
  type RandomizerHistoryEntry,
  type RandomizerListMode,
  type RandomizerMode,
} from "../features/randomizer/randomizerLogic";

type AdminSection =
  | "general"
  | "questions"
  | "speakers"
  | "banners"
  | "branding"
  | "report"
  | "results"
  | "danger";

const ADMIN_BANNER_AUTO_HIDE_MS = 2000;
const RESULTS_UI_STORAGE_PREFIX = "mq_admin_results_ui_";
const EXPANDED_SUBQUIZ_STORAGE_PREFIX = "mq_admin_expanded_subquiz_";
const ADMIN_BODY_BG_FALLBACK = "#22313c";
const DEFAULT_REPORT_MODULES: ReportModuleId[] = [
  "event_header",
  "participation_summary",
  "quiz_results",
  "vote_results",
  "reactions_summary",
  "randomizer_summary",
  "speaker_questions_summary",
];

function normalizeReportModulesForAdmin(value: unknown): ReportModuleId[] {
  if (!Array.isArray(value)) return [...DEFAULT_REPORT_MODULES];
  const next: ReportModuleId[] = [];
  for (const item of value) {
    if (item === "question_results") {
      if (!next.includes("quiz_results")) next.push("quiz_results");
      if (!next.includes("vote_results")) next.push("vote_results");
      continue;
    }
    if (
      item === "event_header" ||
      item === "participation_summary" ||
      item === "quiz_results" ||
      item === "vote_results" ||
      item === "reactions_summary" ||
      item === "randomizer_summary" ||
      item === "speaker_questions_summary"
    ) {
      if (!next.includes(item)) next.push(item);
    }
  }
  return next.length > 0 ? next : [...DEFAULT_REPORT_MODULES];
}

function buildEffectiveTilesOrder(order: string[], banners: PublicBanner[]): string[] {
  const deduped: string[] = [];
  for (const id of order) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (!deduped.includes(id)) deduped.push(id);
  }
  for (const banner of banners) {
    if (!deduped.includes(banner.id)) deduped.push(banner.id);
  }
  if (!deduped.includes(SPEAKER_TILE_ID)) deduped.push(SPEAKER_TILE_ID);
  if (!deduped.includes(PROGRAM_TILE_ID)) deduped.push(PROGRAM_TILE_ID);
  return deduped;
}

const ADMIN_NAV: {
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "general", label: "Общее", icon: <SettingsSuggestIcon fontSize="small" /> },
  { id: "questions", label: "Вопросы", icon: <QuizIcon fontSize="small" /> },
  { id: "speakers", label: "Спикеры", icon: <RecordVoiceOverIcon fontSize="small" /> },
  { id: "banners", label: "Баннеры", icon: <ViewCarouselIcon fontSize="small" /> },
  { id: "results", label: "Результаты", icon: <InsightsIcon fontSize="small" /> },
  { id: "report", label: "Отчет", icon: <DescriptionIcon fontSize="small" /> },
  { id: "branding", label: "Брендирование", icon: <BrandingWatermarkIcon fontSize="small" /> },
  { id: "danger", label: "Опасные", icon: <ReportProblemIcon fontSize="small" /> },
];

function publicScreenModeLabel(mode: PublicViewMode): string {
  if (mode === "leaderboard") return "таблица лидеров";
  if (mode === "speaker_questions") return "вопросы спикерам";
  if (mode === "reactions") return "реакции";
  if (mode === "randomizer") return "рандомайзер";
  if (mode === "report") return "отчет";
  if (mode === "question") return "вопрос";
  return "название";
}

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

function parseReactionLines(text: string): string[] {
  const deduped: string[] = [];
  for (const line of text.split("\n")) {
    const value = line.trim();
    if (!value) continue;
    if (!deduped.includes(value)) deduped.push(value);
  }
  return deduped;
}

function getQuestionTypeSelectValue(
  question: QuestionForm,
): "single" | "multi" | "ranking" | "tag_cloud" | "poll" {
  if (
    (question.subQuizId == null || question.subQuizId === undefined) &&
    (question.type === "single" || question.type === "multi") &&
    !isEditorQuizMode(question)
  ) {
    return "poll";
  }
  return question.type;
}

function getReactionWidgetsOrNull(value: unknown): ReactionWidget[] | null {
  if (!Array.isArray(value)) return null;
  const widgets: ReactionWidget[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; title?: unknown; reactions?: unknown };
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    const reactions = Array.isArray(row.reactions)
      ? row.reactions
          .filter((reaction): reaction is string => typeof reaction === "string")
          .map((reaction) => reaction.trim())
          .filter((reaction) => reaction.length > 0)
      : [];
    if (reactions.length === 0) continue;
    widgets.push({
      id: row.id.trim(),
      title: typeof row.title === "string" ? row.title : "",
      reactions,
    });
  }
  return widgets;
}

function getReactionWidgetStatsOrNull(
  value: unknown,
): Array<{ widgetId: string; counts: Record<string, number> }> | null {
  if (!Array.isArray(value)) return null;
  const result: Array<{ widgetId: string; counts: Record<string, number> }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { widgetId?: unknown; counts?: unknown };
    if (typeof row.widgetId !== "string" || !row.widgetId.trim()) continue;
    if (!row.counts || typeof row.counts !== "object" || Array.isArray(row.counts)) continue;
    const counts: Record<string, number> = {};
    for (const [reaction, rawCount] of Object.entries(row.counts as Record<string, unknown>)) {
      if (typeof reaction !== "string" || !reaction.trim()) continue;
      const value = Number(rawCount);
      counts[reaction.trim()] = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    }
    result.push({ widgetId: row.widgetId.trim(), counts });
  }
  return result;
}

function readReactionWidgetsFromStorage(storageKey: string): ReactionWidget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return getReactionWidgetsOrNull(parsed) ?? [];
  } catch {
    return [];
  }
}

function readOverlayTextFromStorage(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const value = raw.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function AdminEventPage() {
  const defaultRankingQuizHint =
    "Расставьте варианты от лучшего к худшему (первый в списке — лучший).";
  const defaultRankingJuryHint =
    "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется.";
  const { eventName = "" } = useParams();
  const resultsUiStorageKey = `${RESULTS_UI_STORAGE_PREFIX}${eventName}`;
  const expandedSubQuizStorageKey = `${EXPANDED_SUBQUIZ_STORAGE_PREFIX}${eventName}`;
  const reactionWidgetsStorageKey = `mq_reaction_widgets_${eventName}`;
  const reactionsOverlayTextStorageKey = `mq_reaction_overlay_text_${eventName}`;
  const [isAuth, setIsAuth] = useState(false);
  const [room, setRoom] = useState<AdminEventRoom | null>(null);
  const [quizId, setQuizId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [subQuizSheets, setSubQuizSheets] = useState<SubQuizSheet[]>([]);
  const [roomQuestionsTab, setRoomQuestionsTab] = useState<
    "quizzes" | "votes" | "reactions" | "randomizer"
  >("quizzes");
  const [expandedSubQuizId, setExpandedSubQuizId] = useState<string | false>(false);
  const [questionForms, setQuestionForms] = useState<QuestionForm[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [leaderboardsBySubQuiz, setLeaderboardsBySubQuiz] = useState<SubQuizLeaderboardPayload[]>(
    [],
  );
  const [resultsSubQuizId, setResultsSubQuizId] = useState<string>("");
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [confirmResetQuestionIndex, setConfirmResetQuestionIndex] = useState<number | null>(null);
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
  const [activeSection, setActiveSection] = useState<AdminSection>("questions");
  const [speakerQuestionsPayload, setSpeakerQuestionsPayload] =
    useState<SpeakerQuestionsPayload | null>(null);
  const [reactionSession, setReactionSession] = useState<ReactionSession | null>(null);
  const [reactionsDurationSec, setReactionsDurationSec] = useState(30);
  const [reactionsOverlayText, setReactionsOverlayText] = useState(
    () => readOverlayTextFromStorage(reactionsOverlayTextStorageKey) ?? "Реакции аудитории",
  );
  const [reactionWidgets, setReactionWidgets] = useState<ReactionWidget[]>(() =>
    readReactionWidgetsFromStorage(reactionWidgetsStorageKey),
  );
  const [reactionWidgetStats, setReactionWidgetStats] = useState<PublicReactionWidgetStats[]>([]);
  const [activeReactionWidgetId, setActiveReactionWidgetId] = useState<string | null>(null);
  const [projectorReactionWidgetId, setProjectorReactionWidgetId] = useState<string | null>(null);
  const [randomizerMode, setRandomizerMode] = useState<RandomizerMode>("names");
  const [randomizerListMode, setRandomizerListMode] = useState<RandomizerListMode>("free_list");
  const [randomizerTitle, setRandomizerTitle] = useState("Рандомайзер");
  const [randomizerNamesText, setRandomizerNamesText] = useState("");
  const [randomizerMinNumber, setRandomizerMinNumber] = useState(1);
  const [randomizerMaxNumber, setRandomizerMaxNumber] = useState(100);
  const [randomizerWinnersCount, setRandomizerWinnersCount] = useState(1);
  const [randomizerExcludeWinners, setRandomizerExcludeWinners] = useState(true);
  const [randomizerSelectedWinners, setRandomizerSelectedWinners] = useState<string[]>([]);
  const [randomizerCurrentWinners, setRandomizerCurrentWinners] = useState<string[]>([]);
  const [randomizerHistory, setRandomizerHistory] = useState<RandomizerHistoryEntry[]>([]);
  const [randomizerRunId, setRandomizerRunId] = useState(0);
  const [reportTitle, setReportTitle] = useState("Отчет мероприятия");
  const [reportModules, setReportModules] = useState<ReportModuleId[]>(DEFAULT_REPORT_MODULES);
  const [reportVoteQuestionIds, setReportVoteQuestionIds] = useState<string[]>([]);
  const [reportQuizQuestionIds, setReportQuizQuestionIds] = useState<string[]>([]);
  const [reportQuizSubQuizIds, setReportQuizSubQuizIds] = useState<string[]>([]);
  const [reportSubQuizHideParticipantTableIds, setReportSubQuizHideParticipantTableIds] = useState<
    string[]
  >([]);
  const [reportRandomizerRunIds, setReportRandomizerRunIds] = useState<string[]>([]);
  const [reportReactionsWidgetIds, setReportReactionsWidgetIds] = useState<string[]>([]);
  const [reportSpeakerQuestionIds, setReportSpeakerQuestionIds] = useState<string[]>([]);
  const [reportPublished, setReportPublished] = useState(false);
  const [randomizerIsRunning, setRandomizerIsRunning] = useState(false);
  const randomizerRunTimerRef = useRef<number | null>(null);
  const [eventParticipantNicknames, setEventParticipantNicknames] = useState<string[]>([]);
  const randomizerNamesEditedRef = useRef(false);
  const reactionsWidgetsResyncDoneRef = useRef<string | null>(null);
  const applyRandomizerFromPublicView = useCallback((payload: PublicViewPayload) => {
    setRandomizerMode(payload.randomizerMode === "numbers" ? "numbers" : "names");
    setRandomizerListMode(
      payload.randomizerListMode === "participants_only" ? "participants_only" : "free_list",
    );
    if (typeof payload.randomizerTitle === "string") {
      setRandomizerTitle(payload.randomizerTitle);
    }
    setRandomizerNamesText(
      typeof payload.randomizerNamesText === "string" ? payload.randomizerNamesText : "",
    );
    if (typeof payload.randomizerMinNumber === "number") {
      setRandomizerMinNumber(Math.trunc(payload.randomizerMinNumber));
    }
    if (typeof payload.randomizerMaxNumber === "number") {
      setRandomizerMaxNumber(Math.trunc(payload.randomizerMaxNumber));
    }
    if (typeof payload.randomizerWinnersCount === "number") {
      setRandomizerWinnersCount(Math.max(1, Math.trunc(payload.randomizerWinnersCount)));
    }
    if (typeof payload.randomizerExcludeWinners === "boolean") {
      setRandomizerExcludeWinners(payload.randomizerExcludeWinners);
    }
    if (Array.isArray(payload.randomizerSelectedWinners)) {
      setRandomizerSelectedWinners(
        payload.randomizerSelectedWinners.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    }
    if (Array.isArray(payload.randomizerCurrentWinners)) {
      setRandomizerCurrentWinners(
        payload.randomizerCurrentWinners.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.randomizerHistory)) {
      setRandomizerHistory(
        payload.randomizerHistory
          .filter((row) => row && typeof row.timestamp === "string" && Array.isArray(row.winners))
          .map((row) => ({
            timestamp: row.timestamp,
            winners: row.winners.filter((item): item is string => typeof item === "string"),
            mode: row.mode === "numbers" ? "numbers" : "names",
          })),
      );
    }
    if (typeof payload.randomizerRunId === "number") {
      setRandomizerRunId(Math.max(0, Math.trunc(payload.randomizerRunId)));
    }
    if (typeof payload.reportTitle === "string") {
      setReportTitle(payload.reportTitle);
    }
    if (Array.isArray(payload.reportModules)) {
      setReportModules(normalizeReportModulesForAdmin(payload.reportModules));
    }
    if (Array.isArray(payload.reportVoteQuestionIds)) {
      setReportVoteQuestionIds(
        payload.reportVoteQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportQuizQuestionIds)) {
      setReportQuizQuestionIds(
        payload.reportQuizQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportQuizSubQuizIds)) {
      setReportQuizSubQuizIds(
        payload.reportQuizSubQuizIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportSubQuizHideParticipantTableIds)) {
      setReportSubQuizHideParticipantTableIds(
        payload.reportSubQuizHideParticipantTableIds.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    }
    if (Array.isArray(payload.reportRandomizerRunIds)) {
      setReportRandomizerRunIds(
        payload.reportRandomizerRunIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportReactionsWidgetIds)) {
      setReportReactionsWidgetIds(
        payload.reportReactionsWidgetIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(payload.reportSpeakerQuestionIds)) {
      setReportSpeakerQuestionIds(
        payload.reportSpeakerQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (typeof payload.reportPublished === "boolean") {
      setReportPublished(payload.reportPublished);
    }
  }, []);
  const [speakerQuestionsEnabled, setSpeakerQuestionsEnabled] = useState(false);
  const [speakerQuestionsReactionsText, setSpeakerQuestionsReactionsText] =
    useState("👍\n🔥\n👏\n❤️");
  const [speakerQuestionsShowAuthorOnScreen, setSpeakerQuestionsShowAuthorOnScreen] =
    useState(false);
  const [speakerQuestionsShowRecipientOnScreen, setSpeakerQuestionsShowRecipientOnScreen] =
    useState(true);
  const [speakerQuestionsShowReactionsOnScreen, setSpeakerQuestionsShowReactionsOnScreen] =
    useState(true);
  const [showEventTitleOnPlayer, setShowEventTitleOnPlayer] = useState(true);
  const [playerBanners, setPlayerBanners] = useState<PublicBanner[]>([]);
  const [speakerTileText, setSpeakerTileText] = useState("Вопросы спикерам");
  const [speakerTileBackgroundColor, setSpeakerTileBackgroundColor] = useState("#1976d2");
  const [speakerTileVisible, setSpeakerTileVisible] = useState(true);
  const [programTileText, setProgramTileText] = useState("Программа");
  const [programTileBackgroundColor, setProgramTileBackgroundColor] = useState("#6a1b9a");
  const [programTileLinkUrl, setProgramTileLinkUrl] = useState("");
  const [programTileVisible, setProgramTileVisible] = useState(false);
  const [playerTilesOrder, setPlayerTilesOrder] = useState<string[]>([
    SPEAKER_TILE_ID,
    PROGRAM_TILE_ID,
  ]);
  const [speakerListText, setSpeakerListText] = useState("");
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
  const [projectorBackground, setProjectorBackground] = useState("#7c5acb");
  const [cloudQuestionColor, setCloudQuestionColor] = useState("#1f1f1f");
  const [cloudTagColors, setCloudTagColors] = useState<string[]>([
    "#1f1f1f",
    "#1976d2",
    "#2e7d32",
    "#ef6c00",
    "#6a1b9a",
  ]);
  const [cloudTopTagColor, setCloudTopTagColor] = useState("#d32f2f");
  const [cloudCorrectTagColor, setCloudCorrectTagColor] = useState("#2e7d32");
  const [cloudDensity, setCloudDensity] = useState(60);
  const [cloudTagPadding, setCloudTagPadding] = useState(5);
  const [cloudSpiral, setCloudSpiral] = useState<"archimedean" | "rectangular">("archimedean");
  const [cloudAnimationStrength, setCloudAnimationStrength] = useState(30);
  const [voteQuestionTextColor, setVoteQuestionTextColor] = useState("#1f1f1f");
  const [voteOptionTextColor, setVoteOptionTextColor] = useState("#1f1f1f");
  const [voteProgressTrackColor, setVoteProgressTrackColor] = useState("#e3e3e3");
  const [voteProgressBarColor, setVoteProgressBarColor] = useState("#1976d2");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#7c5acb");
  const [brandAccentColor, setBrandAccentColor] = useState("#1976d2");
  const [brandSurfaceColor, setBrandSurfaceColor] = useState("#ffffff");
  const [brandTextColor, setBrandTextColor] = useState("#1f1f1f");
  const [brandFontFamily, setBrandFontFamily] = useState("Jost, Arial, sans-serif");
  const [brandFontUrl, setBrandFontUrl] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandPlayerBackgroundImageUrl, setBrandPlayerBackgroundImageUrl] = useState("");
  const [brandProjectorBackgroundImageUrl, setBrandProjectorBackgroundImageUrl] = useState("");
  const [brandBodyBackgroundColor, setBrandBodyBackgroundColor] = useState("#000000");
  const [availableFonts, setAvailableFonts] = useState<
    Array<{ id: string; family: string; url: string; kind: "static" | "variable" }>
  >([]);
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
  const cloudManualSyncRef = useRef("");
  const cloudManualStorageKey = `mq_cloud_manual_${eventName}`;
  const syncedSubQuizIdsKeyRef = useRef("");
  const questionFormsRef = useRef<QuestionForm[]>([]);
  questionFormsRef.current = questionForms;
  /** Чтобы не вызывать removeItem(localStorage) на первом кадре, пока эффект не восстановил раскрытие из LS. */
  const isFirstExpandedPersistEffect = useRef(true);

  useEffect(() => {
    const root = document.getElementById("root");
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyImg = document.body.style.backgroundImage;
    const prevBodyAtt = document.body.style.backgroundAttachment;
    const prevOverflowX = document.body.style.overflowX;
    const prevRootBg = root?.style.backgroundColor ?? "";
    const hadPlayerBrandClass = document.body.classList.contains("mq-player-brand-bg");
    const hadAdminBrandClass = document.body.classList.contains("mq-admin-brand-bg");
    const nextBodyBg = brandBodyBackgroundColor?.trim() || ADMIN_BODY_BG_FALLBACK;

    document.body.style.backgroundColor = nextBodyBg;
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundAttachment = "";
    document.body.style.overflowX = "";
    document.body.classList.add("mq-admin-brand-bg");
    document.body.classList.remove("mq-player-brand-bg");
    if (root) root.style.backgroundColor = "transparent";

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.backgroundImage = prevBodyImg;
      document.body.style.backgroundAttachment = prevBodyAtt;
      document.body.style.overflowX = prevOverflowX;
      if (root) root.style.backgroundColor = prevRootBg;
      if (hadAdminBrandClass) document.body.classList.add("mq-admin-brand-bg");
      else document.body.classList.remove("mq-admin-brand-bg");
      if (hadPlayerBrandClass) document.body.classList.add("mq-player-brand-bg");
    };
  }, [brandBodyBackgroundColor]);

  const {
    checkSession,
    loadRoom,
    persistQuestions,
    patchQuestionProjectorSettings,
    saveQuizTitle: saveQuizTitleApi,
  } = useAdminEventApi({
    eventName,
    cloudManualStorageKey,
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
    void saveQuizTitleApi(editableTitle, room?.title);
  }

  const joinUrl = useMemo(() => {
    if (!room) return "";
    return `${APP_ORIGIN}/q/${room.slug}`;
  }, [room]);

  const screenUrl = useMemo(() => {
    if (!room) return "";
    return `${APP_ORIGIN}/p/${room.slug}`;
  }, [room]);

  const votesIndexMap = useMemo(
    () => buildQuestionIndexMapForSubQuiz(questionForms, null),
    [questionForms],
  );

  const votesSelectedListIndex = useMemo(() => {
    const si = votesIndexMap.indexOf(selectedQuestionIndex);
    return si < 0 ? 0 : si;
  }, [votesIndexMap, selectedQuestionIndex]);
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
    setExpandedQuestionSettingsIndex(null);
  }, [roomQuestionsTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(reactionWidgetsStorageKey, JSON.stringify(reactionWidgets));
    } catch {
      /* ignore */
    }
  }, [reactionWidgets, reactionWidgetsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(reactionsOverlayTextStorageKey, reactionsOverlayText);
    } catch {
      /* ignore */
    }
  }, [reactionsOverlayText, reactionsOverlayTextStorageKey]);

  useEffect(() => {
    if (roomQuestionsTab === "quizzes") {
      setExpandedQuestionSettingsIndex(null);
    }
  }, [expandedSubQuizId, roomQuestionsTab]);

  useEffect(() => {
    if (leaderboardsBySubQuiz.length === 0) return;
    if (!resultsSubQuizId || !leaderboardsBySubQuiz.some((x) => x.subQuizId === resultsSubQuizId)) {
      setResultsSubQuizId(leaderboardsBySubQuiz[0]?.subQuizId ?? "");
    }
  }, [leaderboardsBySubQuiz, resultsSubQuizId]);

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
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudCorrectTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setBrandPrimaryColor,
    setBrandAccentColor,
    setBrandSurfaceColor,
    setBrandTextColor,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandLogoUrl,
    setBrandPlayerBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    setBrandBodyBackgroundColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
    setSpeakerQuestionsPayload,
    setReactionSession,
    setReactionsOverlayText,
    setOnlineUsersCount,
  });

  useEffect(() => {
    const onPublicView = (payload: PublicViewPayload) => {
      const widgets = getReactionWidgetsOrNull(payload.reactionsWidgets);
      if (widgets) setReactionWidgets(widgets);
      const widgetStats = getReactionWidgetStatsOrNull(
        (payload as { reactionsWidgetStats?: unknown }).reactionsWidgetStats,
      );
      if (widgetStats) setReactionWidgetStats(widgetStats);
      if (typeof payload.reactionsOverlayText === "string") {
        setReactionsOverlayText(payload.reactionsOverlayText);
      }
      applyRandomizerFromPublicView(payload);
      const normalizedView = normalizePublicViewState(payload);
      applySpeakerQuestionsScreenVisibilityFromView(normalizedView, {
        setShowAuthorOnScreen: setSpeakerQuestionsShowAuthorOnScreen,
        setShowRecipientOnScreen: setSpeakerQuestionsShowRecipientOnScreen,
        setShowReactionsOnScreen: setSpeakerQuestionsShowReactionsOnScreen,
      });
    };
    socket.on("results:public:view", onPublicView);
    return () => {
      socket.off("results:public:view", onPublicView);
    };
  }, [applyRandomizerFromPublicView]);

  const { emitPublicViewSet, emitBrandingPatch } = usePublicViewEmitter({
    quizId,
    publicViewMode,
    publicViewQuestionId,
    questionRevealStage,
    highlightedLeadersCount,
    questionForms,
    projectorBackground,
    cloudQuestionColor,
    cloudTagColors,
    cloudTopTagColor,
    cloudCorrectTagColor,
    cloudDensity,
    cloudTagPadding,
    cloudSpiral,
    cloudAnimationStrength,
    voteQuestionTextColor,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
    showFirstCorrectAnswerer,
    firstCorrectWinnersCount,
    showEventTitleOnPlayer,
    playerBanners,
    speakerTileText,
    speakerTileBackgroundColor,
    speakerTileVisible,
    programTileText,
    programTileBackgroundColor,
    programTileLinkUrl,
    programTileVisible,
    playerVisibleResultQuestionIds,
    playerTilesOrder,
    reactionsOverlayText,
    reactionsWidgets: reactionWidgets,
    randomizerMode,
    randomizerListMode,
    randomizerTitle,
    randomizerNamesText,
    randomizerMinNumber,
    randomizerMaxNumber,
    randomizerWinnersCount,
    randomizerExcludeWinners,
    randomizerSelectedWinners,
    randomizerCurrentWinners,
    randomizerHistory,
    randomizerRunId,
    reportTitle,
    reportModules,
    reportVoteQuestionIds,
    reportQuizQuestionIds,
    reportQuizSubQuizIds,
    reportSubQuizHideParticipantTableIds,
    reportRandomizerRunIds,
    reportReactionsWidgetIds,
    reportSpeakerQuestionIds,
    reportPublished,
    brandPrimaryColor,
    brandAccentColor,
    brandSurfaceColor,
    brandTextColor,
    brandFontFamily,
    brandFontUrl,
    brandLogoUrl,
    brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor,
  });

  useEffect(() => {
    if (!quizId || !room?.publicView || typeof room.publicView !== "object") return;
    if (reactionsWidgetsResyncDoneRef.current === quizId) return;
    const serverWidgets = getReactionWidgetsOrNull(
      (room.publicView as { reactionsWidgets?: unknown }).reactionsWidgets,
    );
    if ((serverWidgets?.length ?? 0) > 0) {
      reactionsWidgetsResyncDoneRef.current = quizId;
      return;
    }
    if (reactionWidgets.length === 0) return;
    emitPublicViewSet({ reactionsWidgets: reactionWidgets });
    reactionsWidgetsResyncDoneRef.current = quizId;
    setMessage("Виджеты реакций восстановлены после перезапуска");
  }, [emitPublicViewSet, quizId, reactionWidgets, room?.publicView, setMessage]);

  useEffect(() => {
    const payload: CloudManualStateByQuestion = {};
    questionForms.forEach((q) => {
      if (!q.id) return;
      payload[q.id] = {
        hiddenTagTexts: q.hiddenTagTexts ?? [],
        injectedTagWords: q.injectedTagWords ?? [],
        tagCountOverrides: q.tagCountOverrides ?? [],
      };
    });
    localStorage.setItem(cloudManualStorageKey, JSON.stringify(payload));
  }, [cloudManualStorageKey, questionForms]);

  useEffect(() => {
    checkSession().then((ok) => {
      if (!ok) return;
      loadRoom();
      void loadFontLibrary();
      setupSocketListeners();
    });
    return () => {
      clearSocketListeners();
    };
  }, [checkSession, clearSocketListeners, eventName, loadRoom, setupSocketListeners]);

  useEffect(() => {
    if (!isAuth) return;
    let active = true;
    const fetchParticipants = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/participants`,
          { credentials: "include" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as { nicknames?: unknown };
        const nicknames = Array.isArray(payload.nicknames)
          ? payload.nicknames.filter((item): item is string => typeof item === "string")
          : [];
        if (!active) return;
        setEventParticipantNicknames(nicknames);
      } catch {
        // ignore network errors and keep manual list input available
      }
    };
    void fetchParticipants();
    return () => {
      active = false;
    };
  }, [eventName, isAuth]);

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
  useEffect(() => {
    if (!room?.publicView || typeof room.publicView !== "object") return;
    const pv = room.publicView;
    if (isSupportedPublicMode(pv.mode)) {
      setPublicViewMode(pv.mode);
    }
    setPublicViewQuestionId(typeof pv.questionId === "string" ? pv.questionId : undefined);
    setQuestionRevealStage(pv.questionRevealStage === "results" ? "results" : "options");
    if (typeof pv.highlightedLeadersCount === "number") {
      setHighlightedLeadersCount(pv.highlightedLeadersCount);
    }
    const qid = typeof pv.questionId === "string" ? pv.questionId : undefined;
    if (qid) setQuestionForms((prev) => patchQuestionsFromPublicView(prev, pv));
    const b = toBrandingState(pv);
    setProjectorBackground(b.projectorBackground);
    setCloudQuestionColor(b.cloudQuestionColor);
    setCloudTagColors(b.cloudTagColors);
    setCloudTopTagColor(b.cloudTopTagColor);
    setCloudCorrectTagColor(b.cloudCorrectTagColor);
    setCloudDensity(clampInt(b.cloudDensity, 0, 100));
    setCloudTagPadding(clampInt(b.cloudTagPadding, 0, 40));
    setCloudSpiral(b.cloudSpiral);
    setCloudAnimationStrength(clampInt(b.cloudAnimationStrength, 0, 100));
    setVoteQuestionTextColor(b.voteQuestionTextColor);
    setVoteOptionTextColor(b.voteOptionTextColor);
    setVoteProgressTrackColor(b.voteProgressTrackColor);
    setVoteProgressBarColor(b.voteProgressBarColor);
    setBrandPrimaryColor(b.brandPrimaryColor);
    setBrandAccentColor(b.brandAccentColor);
    setBrandSurfaceColor(b.brandSurfaceColor);
    setBrandTextColor(b.brandTextColor);
    setBrandFontFamily(b.brandFontFamily);
    setBrandFontUrl(b.brandFontUrl);
    setBrandLogoUrl(b.brandLogoUrl);
    setBrandPlayerBackgroundImageUrl(b.brandPlayerBackgroundImageUrl);
    setBrandProjectorBackgroundImageUrl(b.brandProjectorBackgroundImageUrl);
    setBrandBodyBackgroundColor(b.brandBodyBackgroundColor);
    if (typeof pv.showFirstCorrectAnswerer === "boolean") {
      setShowFirstCorrectAnswerer(pv.showFirstCorrectAnswerer);
    }
    if (typeof pv.firstCorrectWinnersCount === "number") {
      setFirstCorrectWinnersCount(clampInt(pv.firstCorrectWinnersCount, 1, 20));
    }
    applySpeakerQuestionsAdminFieldsFromPublicView(pv, {
      setEnabled: setSpeakerQuestionsEnabled,
      setReactionsText: setSpeakerQuestionsReactionsText,
      setShowAuthorOnScreen: setSpeakerQuestionsShowAuthorOnScreen,
      setShowRecipientOnScreen: setSpeakerQuestionsShowRecipientOnScreen,
      setShowReactionsOnScreen: setSpeakerQuestionsShowReactionsOnScreen,
    });
    if (typeof pv.showEventTitleOnPlayer === "boolean") {
      setShowEventTitleOnPlayer(pv.showEventTitleOnPlayer);
    }
    const nextBanners = getPublicBanners(pv.playerBanners);
    setPlayerBanners(nextBanners);
    if (typeof pv.speakerTileText === "string") {
      setSpeakerTileText(pv.speakerTileText);
    }
    if (typeof pv.speakerTileBackgroundColor === "string") {
      setSpeakerTileBackgroundColor(pv.speakerTileBackgroundColor);
    }
    if (typeof pv.speakerTileVisible === "boolean") {
      setSpeakerTileVisible(pv.speakerTileVisible);
    }
    if (typeof pv.programTileText === "string") {
      setProgramTileText(pv.programTileText);
    }
    if (typeof pv.programTileBackgroundColor === "string") {
      setProgramTileBackgroundColor(pv.programTileBackgroundColor);
    }
    if (typeof pv.programTileLinkUrl === "string") {
      setProgramTileLinkUrl(pv.programTileLinkUrl);
    }
    if (typeof pv.programTileVisible === "boolean") {
      setProgramTileVisible(pv.programTileVisible);
    }
    if (Array.isArray(pv.playerVisibleResultQuestionIds)) {
      setPlayerVisibleResultQuestionIds(
        pv.playerVisibleResultQuestionIds.filter((x): x is string => typeof x === "string"),
      );
    }
    const nextTilesOrder = getStringArrayOrNull(pv.playerTilesOrder) ?? [];
    setPlayerTilesOrder(buildEffectiveTilesOrder(nextTilesOrder, nextBanners));
    if (typeof pv.reactionsOverlayText === "string") {
      setReactionsOverlayText(pv.reactionsOverlayText);
    }
    const widgets = getReactionWidgetsOrNull(pv.reactionsWidgets);
    if (widgets) {
      setReactionWidgets(widgets);
    }
    const widgetStats = getReactionWidgetStatsOrNull(
      (pv as { reactionsWidgetStats?: unknown }).reactionsWidgetStats,
    );
    if (widgetStats) {
      setReactionWidgetStats(widgetStats);
    }
    setRandomizerMode(pv.randomizerMode === "numbers" ? "numbers" : "names");
    setRandomizerListMode(
      pv.randomizerListMode === "participants_only" ? "participants_only" : "free_list",
    );
    if (typeof pv.randomizerTitle === "string") setRandomizerTitle(pv.randomizerTitle);
    if (typeof pv.randomizerNamesText === "string") setRandomizerNamesText(pv.randomizerNamesText);
    if (typeof pv.randomizerMinNumber === "number")
      setRandomizerMinNumber(Math.trunc(pv.randomizerMinNumber));
    if (typeof pv.randomizerMaxNumber === "number")
      setRandomizerMaxNumber(Math.trunc(pv.randomizerMaxNumber));
    if (typeof pv.randomizerWinnersCount === "number") {
      setRandomizerWinnersCount(Math.max(1, Math.trunc(pv.randomizerWinnersCount)));
    }
    if (typeof pv.randomizerExcludeWinners === "boolean") {
      setRandomizerExcludeWinners(pv.randomizerExcludeWinners);
    }
    if (Array.isArray(pv.randomizerSelectedWinners)) {
      setRandomizerSelectedWinners(
        pv.randomizerSelectedWinners.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.randomizerCurrentWinners)) {
      setRandomizerCurrentWinners(
        pv.randomizerCurrentWinners.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.randomizerHistory)) {
      setRandomizerHistory(
        pv.randomizerHistory
          .filter((row) => row && typeof row.timestamp === "string" && Array.isArray(row.winners))
          .map((row) => ({
            timestamp: row.timestamp,
            winners: row.winners.filter((item): item is string => typeof item === "string"),
            mode: row.mode === "numbers" ? "numbers" : "names",
          })),
      );
    }
    if (typeof pv.randomizerRunId === "number")
      setRandomizerRunId(Math.max(0, Math.trunc(pv.randomizerRunId)));
    if (typeof pv.reportTitle === "string") setReportTitle(pv.reportTitle);
    if (Array.isArray(pv.reportModules)) {
      setReportModules(normalizeReportModulesForAdmin(pv.reportModules));
    }
    if (Array.isArray(pv.reportVoteQuestionIds)) {
      setReportVoteQuestionIds(
        pv.reportVoteQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.reportQuizQuestionIds)) {
      setReportQuizQuestionIds(
        pv.reportQuizQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.reportQuizSubQuizIds)) {
      setReportQuizSubQuizIds(
        pv.reportQuizSubQuizIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.reportSubQuizHideParticipantTableIds)) {
      setReportSubQuizHideParticipantTableIds(
        pv.reportSubQuizHideParticipantTableIds.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    }
    if (Array.isArray(pv.reportRandomizerRunIds)) {
      setReportRandomizerRunIds(
        pv.reportRandomizerRunIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.reportReactionsWidgetIds)) {
      setReportReactionsWidgetIds(
        pv.reportReactionsWidgetIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (Array.isArray(pv.reportSpeakerQuestionIds)) {
      setReportSpeakerQuestionIds(
        pv.reportSpeakerQuestionIds.filter((item): item is string => typeof item === "string"),
      );
    }
    if (typeof pv.reportPublished === "boolean") setReportPublished(pv.reportPublished);
    const speakerList = getStringArrayOrNull(pv.speakerQuestionsSpeakers);
    if (speakerList) {
      setSpeakerListText(speakerList.join("\n"));
    }
  }, [room?.id, room?.publicView]);

  const reactionWidgetStatsById = useMemo(
    () =>
      reactionWidgetStats.reduce<Record<string, Record<string, number>>>((acc, row) => {
        acc[row.widgetId] = row.counts;
        return acc;
      }, {}),
    [reactionWidgetStats],
  );

  useEffect(() => {
    if (!isAuth || !quizId || publicViewMode !== "question" || !publicViewQuestionId) return;
    const question = questionForms.find((q) => q.id === publicViewQuestionId);
    if (!question) return;
    const signature = JSON.stringify({
      qid: publicViewQuestionId,
      hidden: question.hiddenTagTexts ?? [],
      injected: question.injectedTagWords ?? [],
      overrides: question.tagCountOverrides ?? [],
    });
    if (cloudManualSyncRef.current === signature) return;
    cloudManualSyncRef.current = signature;
    emitPublicViewSet({
      mode: "question",
      questionId: publicViewQuestionId,
      showVoteCount: question.showVoteCount ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: question.tagCountOverrides ?? [],
    });
  }, [
    cloudAnimationStrength,
    cloudDensity,
    cloudQuestionColor,
    cloudSpiral,
    cloudTagColors,
    cloudTagPadding,
    voteQuestionTextColor,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
    highlightedLeadersCount,
    isAuth,
    projectorBackground,
    publicViewMode,
    publicViewQuestionId,
    questionForms,
    quizId,
    emitPublicViewSet,
  ]);

  useEffect(() => {
    if (randomizerMode !== "names") return;
    if (randomizerListMode !== "free_list") return;
    if (randomizerNamesEditedRef.current) return;
    if (randomizerNamesText.trim().length > 0) return;
    if (eventParticipantNicknames.length === 0) return;
    const next = eventParticipantNicknames.join("\n");
    setRandomizerNamesText(next);
  }, [eventParticipantNicknames, randomizerListMode, randomizerMode, randomizerNamesText]);

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
    return publicScreenModeLabel(publicViewMode);
  }, [publicViewMode]);

  function cloneQuestionForms(forms: QuestionForm[]): QuestionForm[] {
    return JSON.parse(JSON.stringify(forms)) as QuestionForm[];
  }

  function addSubQuizSheet() {
    const id = `new-${crypto.randomUUID()}`;
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
          } else if (!next.options.some((o) => o.isCorrect)) {
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
        const nextOpts = [...q.options, { text: "", isCorrect: false }];
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
    socket.emit("admin:answers:reset-question", {
      quizId,
      questionId: question.id,
    });
    setMessage("Ответы по выбранному вопросу обнулены");
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
    setMessage("Все ответы в комнате обнулены");
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
    if (enabled) {
      for (const q of questionForms) {
        if (q.id && q.id !== question.id && q.isActive) {
          socket.emit("question:toggle", {
            quizId,
            questionId: q.id,
            enabled: false,
          });
        }
      }
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
        ...extraPatch,
      });
    },
    [emitPublicViewSet, questionForms, quizId],
  );

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

  const runRandomizer = useCallback(() => {
    const effectiveNamesText =
      randomizerListMode === "participants_only"
        ? eventParticipantNicknames.join("\n")
        : randomizerNamesText;
    const pool = getRandomizerPool({
      mode: randomizerMode,
      namesText: effectiveNamesText,
      minNumber: randomizerMinNumber,
      maxNumber: randomizerMaxNumber,
      winnersCount: randomizerWinnersCount,
      excludeWinners: randomizerExcludeWinners,
      selectedWinners: randomizerSelectedWinners,
    });
    if (pool.length === 0) {
      setMessage("Для рандомайзера нет доступных значений");
      return;
    }
    const winners = pickRandomWinners(pool, randomizerWinnersCount);
    if (winners.length === 0) {
      setMessage("Не удалось выбрать победителей");
      return;
    }
    const nextSelected = randomizerExcludeWinners
      ? [...randomizerSelectedWinners, ...winners]
      : randomizerSelectedWinners;
    const nextHistory: RandomizerHistoryEntry[] = [
      { timestamp: makeRandomizerTimestamp(), winners, mode: randomizerMode },
      ...randomizerHistory,
    ].slice(0, 200);
    const nextRunId = randomizerRunId + 1;
    setRandomizerCurrentWinners(winners);
    setRandomizerSelectedWinners(nextSelected);
    setRandomizerHistory(nextHistory);
    setRandomizerRunId(nextRunId);
    setRandomizerIsRunning(true);
    if (randomizerRunTimerRef.current != null) {
      window.clearTimeout(randomizerRunTimerRef.current);
      randomizerRunTimerRef.current = null;
    }
    const totalRunMs = winners.length * (3000 + 1000);
    randomizerRunTimerRef.current = window.setTimeout(() => {
      setRandomizerIsRunning(false);
      randomizerRunTimerRef.current = null;
    }, totalRunMs);
    setPublicResultsView("randomizer", undefined, {
      randomizerMode,
      randomizerListMode,
      randomizerTitle,
      randomizerNamesText: effectiveNamesText,
      randomizerMinNumber,
      randomizerMaxNumber,
      randomizerWinnersCount,
      randomizerExcludeWinners,
      randomizerSelectedWinners: nextSelected,
      randomizerCurrentWinners: winners,
      randomizerHistory: nextHistory,
      randomizerRunId: nextRunId,
    });
  }, [
    randomizerExcludeWinners,
    randomizerListMode,
    randomizerHistory,
    randomizerMaxNumber,
    randomizerMinNumber,
    randomizerMode,
    randomizerNamesText,
    randomizerRunId,
    randomizerSelectedWinners,
    randomizerTitle,
    randomizerWinnersCount,
    setPublicResultsView,
    eventParticipantNicknames,
  ]);

  const resetRandomizer = useCallback(() => {
    if (randomizerRunTimerRef.current != null) {
      window.clearTimeout(randomizerRunTimerRef.current);
      randomizerRunTimerRef.current = null;
    }
    setRandomizerIsRunning(false);
    setRandomizerSelectedWinners([]);
    setRandomizerCurrentWinners([]);
    setRandomizerHistory([]);
    setRandomizerRunId(0);
    emitPublicViewSet({
      randomizerSelectedWinners: [],
      randomizerCurrentWinners: [],
      randomizerHistory: [],
      randomizerRunId: 0,
    });
  }, [emitPublicViewSet]);

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

  const clearRandomizerScreenData = useCallback(() => {
    if (randomizerRunTimerRef.current != null) {
      window.clearTimeout(randomizerRunTimerRef.current);
      randomizerRunTimerRef.current = null;
    }
    setRandomizerIsRunning(false);
    setRandomizerCurrentWinners([]);
    emitPublicViewSet({
      randomizerCurrentWinners: [],
    });
  }, [emitPublicViewSet]);

  function toggleReportModule(moduleId: ReportModuleId, enabled: boolean) {
    const next = enabled
      ? reportModules.includes(moduleId)
        ? reportModules
        : [...reportModules, moduleId]
      : reportModules.filter((id) => id !== moduleId);
    setReportModules(next);
    emitPublicViewSet({ reportModules: next });
  }

  function moveReportModule(moduleId: ReportModuleId, direction: -1 | 1) {
    const index = reportModules.indexOf(moduleId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= reportModules.length) return;
    const next = [...reportModules];
    const temp = next[index];
    next[index] = next[nextIndex]!;
    next[nextIndex] = temp!;
    setReportModules(next);
    emitPublicViewSet({ reportModules: next });
  }

  function toggleReportVoteQuestion(questionId: string, enabled: boolean) {
    const allIds = availableVoteQuestions.map((item) => item.id);
    const current =
      reportVoteQuestionIds.length === 0
        ? [...allIds]
        : reportVoteQuestionIds.filter((id) => allIds.includes(id));
    const next = enabled
      ? Array.from(new Set([...current, questionId]))
      : current.filter((id) => id !== questionId);
    setReportVoteQuestionIds(next);
    emitPublicViewSet({ reportVoteQuestionIds: next });
  }

  function toggleReportQuizQuestion(questionId: string, enabled: boolean) {
    const allIds = availableQuizQuestions.flatMap((group) =>
      group.questions.map((question) => question.id),
    );
    const current =
      reportQuizQuestionIds.length === 0
        ? [...allIds]
        : reportQuizQuestionIds.filter((id) => allIds.includes(id));
    const next = enabled
      ? Array.from(new Set([...current, questionId]))
      : current.filter((id) => id !== questionId);
    setReportQuizQuestionIds(next);
    const parentSubQuizId =
      availableQuizQuestions.find((group) =>
        group.questions.some((question) => question.id === questionId),
      )?.subQuizId ?? null;
    const nextSubQuizIds = (() => {
      if (!parentSubQuizId) return reportQuizSubQuizIds;
      const base =
        reportQuizSubQuizIds.length === 0
          ? availableQuizQuestions.map((group) => group.subQuizId)
          : reportQuizSubQuizIds;
      return enabled ? Array.from(new Set([...base, parentSubQuizId])) : base;
    })();
    setReportQuizSubQuizIds(nextSubQuizIds);
    emitPublicViewSet({ reportQuizQuestionIds: next, reportQuizSubQuizIds: nextSubQuizIds });
  }

  function toggleReportQuiz(subQuizId: string, enabled: boolean) {
    const group = availableQuizQuestions.find((item) => item.subQuizId === subQuizId);
    if (!group) return;
    const allIds = availableQuizQuestions.flatMap((item) =>
      item.questions.map((question) => question.id),
    );
    const current =
      reportQuizQuestionIds.length === 0
        ? [...allIds]
        : reportQuizQuestionIds.filter((id) => allIds.includes(id));
    const groupIds = group.questions.map((question) => question.id);
    const next = enabled
      ? Array.from(new Set([...current, ...groupIds]))
      : current.filter((id) => !groupIds.includes(id));
    const nextSubQuizIds = enabled
      ? Array.from(
          new Set([
            ...(reportQuizSubQuizIds.length === 0
              ? availableQuizQuestions.map((item) => item.subQuizId)
              : reportQuizSubQuizIds),
            subQuizId,
          ]),
        )
      : (reportQuizSubQuizIds.length === 0
          ? availableQuizQuestions.map((item) => item.subQuizId)
          : reportQuizSubQuizIds
        ).filter((id) => id !== subQuizId);
    setReportQuizQuestionIds(next);
    setReportQuizSubQuizIds(nextSubQuizIds);
    emitPublicViewSet({
      reportQuizQuestionIds: next,
      reportQuizSubQuizIds: nextSubQuizIds,
    });
  }

  function toggleReportSubQuizParticipantTable(subQuizId: string, enabled: boolean) {
    const allIds = availableQuizQuestions.map((item) => item.subQuizId);
    const base = reportSubQuizHideParticipantTableIds.filter((id) => allIds.includes(id));
    const next = enabled
      ? base.filter((id) => id !== subQuizId)
      : Array.from(new Set([...base, subQuizId]));
    setReportSubQuizHideParticipantTableIds(next);
    emitPublicViewSet({ reportSubQuizHideParticipantTableIds: next });
  }

  function allReportRandomizerRunIds(): string[] {
    const ids = randomizerHistory.map((_, i) => `history:${i}`);
    if (randomizerCurrentWinners.length > 0) ids.push("current");
    return ids;
  }

  function toggleReportRandomizerRun(runId: string, enabled: boolean) {
    const all = allReportRandomizerRunIds();
    const current =
      reportRandomizerRunIds.length === 0
        ? [...all]
        : reportRandomizerRunIds.filter((id) => all.includes(id));
    const next = enabled
      ? Array.from(new Set([...current, runId]))
      : current.filter((id) => id !== runId);
    setReportRandomizerRunIds(next);
    emitPublicViewSet({ reportRandomizerRunIds: next });
  }

  function toggleReportReactionsWidget(widgetId: string, enabled: boolean) {
    const all = reactionWidgets.map((w) => w.id);
    const current =
      reportReactionsWidgetIds.length === 0
        ? [...all]
        : reportReactionsWidgetIds.filter((id) => all.includes(id));
    const next = enabled
      ? Array.from(new Set([...current, widgetId]))
      : current.filter((id) => id !== widgetId);
    setReportReactionsWidgetIds(next);
    emitPublicViewSet({ reportReactionsWidgetIds: next });
  }

  function toggleReportSpeakerQuestion(questionId: string, enabled: boolean) {
    const all = (speakerQuestionsPayload?.items ?? []).map((q) => q.id);
    const current =
      reportSpeakerQuestionIds.length === 0
        ? [...all]
        : reportSpeakerQuestionIds.filter((id) => all.includes(id));
    const next = enabled
      ? Array.from(new Set([...current, questionId]))
      : current.filter((id) => id !== questionId);
    setReportSpeakerQuestionIds(next);
    emitPublicViewSet({ reportSpeakerQuestionIds: next });
  }

  function createPlayerBanner(
    linkUrl: string,
    backgroundUrl: string,
    size: "2x1" | "1x1" | "full",
  ) {
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
    const baseOrder = buildEffectiveTilesOrder(playerTilesOrder, playerBanners);
    const nextOrder = [
      ...baseOrder.filter((x) => x !== SPEAKER_TILE_ID),
      next[next.length - 1]!.id,
      SPEAKER_TILE_ID,
    ];
    setPlayerBanners(next);
    setPlayerTilesOrder(nextOrder);
    emitPublicViewSet({ playerBanners: next, playerTilesOrder: nextOrder });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage("Баннер создан");
  }

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

  async function loadFontLibrary() {
    const response = await fetch(`${API_BASE}/api/admin/fonts`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      fonts?: Array<{ id: string; family: string; url: string; kind?: "static" | "variable" }>;
    };
    setAvailableFonts(
      Array.isArray(payload.fonts)
        ? payload.fonts.map((font) => ({
            ...font,
            kind: font.kind === "variable" ? "variable" : "static",
          }))
        : [],
    );
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
      payload.replacedFamily
        ? `Семейство заменено на вариативный шрифт${duplicateText}`
        : `Шрифты загружены${duplicateText}`,
    );
    const selected = normalizedFonts[0]!;
    return { family: selected.family, url: selected.url };
  }

  function togglePlayerBannerVisible(bannerId: string, next: boolean) {
    if (!quizId) return;
    const updated = playerBanners.map((item) =>
      item.id === bannerId ? { ...item, isVisible: next } : item,
    );
    setPlayerBanners(updated);
    emitPublicViewSet({ playerBanners: updated });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage(next ? "Баннер выведен на экран пользователя" : "Баннер скрыт у пользователя");
  }

  function deletePlayerBanner(bannerId: string) {
    if (!quizId) return;
    const next = playerBanners.filter((item) => item.id !== bannerId);
    const nextOrder = buildEffectiveTilesOrder(playerTilesOrder, playerBanners).filter(
      (id) => id !== bannerId,
    );
    setPlayerBanners(next);
    setPlayerTilesOrder(nextOrder);
    emitPublicViewSet({ playerBanners: next, playerTilesOrder: nextOrder });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage("Баннер удален");
  }

  function updatePlayerBanner(
    id: string,
    linkUrl: string,
    backgroundUrl: string,
    size: "2x1" | "1x1" | "full",
  ) {
    if (!quizId) return;
    const next = playerBanners.map((item) =>
      item.id === id ? { ...item, linkUrl, backgroundUrl, size } : item,
    );
    setPlayerBanners(next);
    emitPublicViewSet({ playerBanners: next });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage("Баннер обновлен");
  }

  function saveSpeakerTile(text: string, backgroundColor: string) {
    if (!quizId) return;
    setSpeakerTileText(text || "Вопросы спикерам");
    setSpeakerTileBackgroundColor(backgroundColor || "#1976d2");
    emitPublicViewSet({
      speakerTileText: text || "Вопросы спикерам",
      speakerTileBackgroundColor: backgroundColor || "#1976d2",
      speakerTileVisible: speakerTileVisible,
    });
    setMessage("Плитка «Вопросы спикерам» обновлена");
  }

  function toggleSpeakerTileVisible(
    next: boolean,
    payload: { text: string; backgroundColor: string },
  ) {
    if (!quizId) return;
    const nextText = payload.text.trim() || "Вопросы спикерам";
    const nextBg = payload.backgroundColor.trim() || "#1976d2";
    setSpeakerTileText(nextText);
    setSpeakerTileBackgroundColor(nextBg);
    setSpeakerTileVisible(next);
    emitPublicViewSet({
      speakerTileText: nextText,
      speakerTileBackgroundColor: nextBg,
      speakerTileVisible: next,
    });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage(
      next
        ? "Плитка «Вопросы спикерам» выведена пользователю"
        : "Плитка «Вопросы спикерам» скрыта у пользователя",
    );
  }

  function saveProgramTile(text: string, backgroundColor: string, linkUrl: string) {
    if (!quizId) return;
    setProgramTileText(text || "Программа");
    setProgramTileBackgroundColor(backgroundColor || "#6a1b9a");
    setProgramTileLinkUrl(linkUrl || "");
    emitPublicViewSet({
      programTileText: text || "Программа",
      programTileBackgroundColor: backgroundColor || "#6a1b9a",
      programTileLinkUrl: linkUrl || "",
      programTileVisible: programTileVisible,
    });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage("Кнопка «Программа» обновлена");
  }

  function toggleProgramTileVisible(
    next: boolean,
    payload: { text: string; backgroundColor: string; linkUrl: string },
  ) {
    if (!quizId) return;
    const nextText = payload.text.trim() || "Программа";
    const nextBg = payload.backgroundColor.trim() || "#6a1b9a";
    const nextLink = payload.linkUrl.trim();
    setProgramTileText(nextText);
    setProgramTileBackgroundColor(nextBg);
    setProgramTileLinkUrl(nextLink);
    setProgramTileVisible(next);
    emitPublicViewSet({
      programTileText: nextText,
      programTileBackgroundColor: nextBg,
      programTileLinkUrl: nextLink,
      programTileVisible: next,
    });
    socket.emit("quiz:state:refresh", { quizId });
    setMessage(
      next
        ? "Кнопка «Программа» выведена пользователю"
        : "Кнопка «Программа» скрыта у пользователя",
    );
  }

  function moveTile(id: string, direction: -1 | 1) {
    if (!quizId) return;
    const current = buildEffectiveTilesOrder(playerTilesOrder, playerBanners);
    const index = current.indexOf(id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    setPlayerTilesOrder(next);
    emitPublicViewSet({ playerTilesOrder: next });
    socket.emit("quiz:state:refresh", { quizId });
  }

  const speakerQuestionsAdminSettings = useMemo(
    () => ({
      enabled: speakerQuestionsEnabled,
      reactionsText: speakerQuestionsReactionsText,
      showAuthorOnScreen: speakerQuestionsShowAuthorOnScreen,
      showRecipientOnScreen: speakerQuestionsShowRecipientOnScreen,
      showReactionsOnScreen: speakerQuestionsShowReactionsOnScreen,
      speakersText: speakerListText,
    }),
    [
      speakerQuestionsEnabled,
      speakerQuestionsReactionsText,
      speakerQuestionsShowAuthorOnScreen,
      speakerQuestionsShowRecipientOnScreen,
      speakerQuestionsShowReactionsOnScreen,
      speakerListText,
    ],
  );

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
    speakerSettings: speakerQuestionsAdminSettings,
    setMessage,
  });

  const saveSpeakerSettingsAndOpenProjector = useCallback(() => {
    saveSpeakerSettings();
    if (speakerQuestionsEnabled) {
      setPublicResultsView("speaker_questions");
    }
  }, [saveSpeakerSettings, speakerQuestionsEnabled, setPublicResultsView]);

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
    emitPublicViewSet({ highlightedLeadersCount: safe });
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
      emitPublicViewSet({ showFirstCorrectAnswerer: next });
    }
  }

  function updateFirstCorrectWinnersCount(raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    setFirstCorrectWinnersCount(safe);
    if (!quizId) return;
    emitPublicViewSet({ firstCorrectWinnersCount: safe });
  }

  function togglePlayerVisibleResultQuestionId(questionIdForTile: string) {
    setPlayerVisibleResultQuestionIds((prev) => {
      const next = prev.includes(questionIdForTile)
        ? prev.filter((x) => x !== questionIdForTile)
        : [...prev, questionIdForTile];
      emitPublicViewSet({ playerVisibleResultQuestionIds: next });
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
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: question.tagCountOverrides ?? [],
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
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: question.tagCountOverrides ?? [],
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
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: question.tagCountOverrides ?? [],
    });
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
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, hiddenTagTexts: nextHidden } : q)),
    );
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
      showQuestionTitle: question.showQuestionTitle ?? true,
      hiddenTagTexts: nextHidden,
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: question.tagCountOverrides ?? [],
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
    setQuestionForms((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, injectedTagWords: nextWords, injectedTagsInput: "" } : q,
      ),
    );
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
      showQuestionTitle: question.showQuestionTitle ?? true,
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: nextWords,
      tagCountOverrides: question.tagCountOverrides ?? [],
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
    setQuestionForms((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      ),
    );
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
      showQuestionTitle: question.showQuestionTitle ?? true,
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: question.injectedTagWords ?? [],
      tagCountOverrides: nextOverrides,
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
    questionDialogSnapshotRef.current = cloneQuestionForms(questionForms);
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
    const err = current ? validateQuestionFormEntry(current, idx) : "Вопрос не выбран.";
    if (err) {
      setQuestionDialogError(err);
      return;
    }
    questionDialogSnapshotRef.current = null;
    const merged = await persistQuestions(questionForms, subQuizSheets, {
      suppressToast: true,
      validateOnlyIndex: idx,
    });
    if (merged === false) {
      setQuestionDialogError(
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
        const nextOpts = [...question.options, { text: value, isCorrect: false }];
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
        <Box sx={{ width: "100%", mb: 0 }}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 0,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "#111",
              color: "#fff",
              px: { xs: 1, sm: 2 },
              py: 0.75,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Typography variant="caption">Экран: {currentPublicScreenText}</Typography>
              <Typography
                variant="caption"
                sx={{
                  color:
                    adminSocketStatus === "connected"
                      ? "success.light"
                      : adminSocketStatus === "connecting"
                        ? "warning.light"
                        : "error.light",
                }}
              >
                Статус:{" "}
                {adminSocketStatus === "connected"
                  ? "подключено"
                  : adminSocketStatus === "connecting"
                    ? "подключение..."
                    : "отключено"}
              </Typography>
              <Typography variant="caption">Онлайн: {onlineUsersCount}</Typography>
            </Stack>
          </Paper>
        </Box>
      ) : null}
      {!isAuth && (
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
              checkSession().then(() => {
                loadRoom();
                setupSocketListeners();
              })
            }
          />
        </Box>
      )}
      {isAuth && room && (
        <Stack direction="row" spacing={0} alignItems="stretch">
          <Card
            variant="outlined"
            component="nav"
            aria-label="Разделы админки"
            sx={{
              width: { xs: 72, md: 256 },
              flexShrink: 0,
              alignSelf: "flex-start",
              position: "sticky",
              top: 0,
              maxHeight: "calc(100vh - 32px)",
              overflowY: "auto",
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <CardContent
              sx={{
                px: { xs: 0.25, md: 1.5 },
                py: { xs: 1, md: 2 },
                "&:last-child": { pb: { xs: 1, md: 2 } },
              }}
            >
              <List
                dense
                sx={{
                  py: 0,
                  display: "block",
                }}
              >
                {ADMIN_NAV.map(({ id, label, icon }) => (
                  <ListItemButton
                    key={id}
                    selected={activeSection === id}
                    onClick={() => setActiveSection(id)}
                    aria-label={label}
                    sx={{
                      minWidth: 0,
                      justifyContent: { xs: "center", md: "flex-start" },
                      borderRadius: 1,
                      py: { xs: 1.25, md: 1 },
                      px: { xs: 0.5, md: 1.25 },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: { xs: 0, md: 40 },
                        mr: { xs: 0, md: 0 },
                        justifyContent: "center",
                      }}
                    >
                      {icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: activeSection === id ? 600 : 400,
                      }}
                      sx={{
                        display: { xs: "none", md: "block" },
                        m: 0,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>

          <Box sx={{ flex: 1, minWidth: 0, mt: 0 }}>
            <Stack spacing={3}>
              {activeSection === "general" && (
                <Stack spacing={2}>
                  <AdminGeneralSection
                    editableTitle={editableTitle}
                    setEditableTitle={setEditableTitle}
                    saveQuizTitle={saveQuizTitle}
                    joinUrl={joinUrl}
                    screenUrl={screenUrl}
                    showEventTitleOnPlayer={showEventTitleOnPlayer}
                    onToggleShowEventTitleOnPlayer={(next) => {
                      setShowEventTitleOnPlayer(next);
                      emitPublicViewSet({ showEventTitleOnPlayer: next });
                      if (quizId) {
                        socket.emit("quiz:state:refresh", { quizId });
                      }
                    }}
                  />
                  {eventName === "demo" && (
                    <Card variant="outlined" sx={{ borderColor: "warning.main" }}>
                      <CardContent>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => setConfirmResetDemoOpen(true)}
                          sx={{ textTransform: "none", alignSelf: "flex-start" }}
                        >
                          Вернуть тестовые данные
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              )}

              {activeSection === "questions" && (
                <Stack spacing={2} sx={{ minWidth: 0 }}>
                  <Paper
                    variant="outlined"
                    elevation={0}
                    sx={{
                      p: 1.25,
                      pt: 0,
                      bgcolor: "background.paper",
                      borderColor: "divider",
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    }}
                  >
                    <Tabs
                      value={roomQuestionsTab}
                      onChange={(_, v: "quizzes" | "votes" | "reactions" | "randomizer") =>
                        setRoomQuestionsTab(v)
                      }
                      sx={{ borderBottom: 1, borderColor: "divider", px: 0.5 }}
                    >
                      <Tab label="Квизы" value="quizzes" />
                      <Tab label="Голосования" value="votes" />
                      <Tab label="Реакции" value="reactions" />
                      <Tab label="Рандомайзер" value="randomizer" />
                    </Tabs>
                    <Box sx={{ pt: 2, px: 0.25 }}>
                      {roomQuestionsTab === "quizzes" &&
                        (subQuizSheets.length === 0 ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 280,
                              py: 6,
                              px: 2,
                            }}
                          >
                            <Button
                              variant="contained"
                              size="large"
                              startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                              onClick={addSubQuizSheet}
                              sx={{
                                py: 2,
                                px: 4,
                                fontSize: "1.1rem",
                                borderRadius: 2,
                                boxShadow: 2,
                              }}
                            >
                              Создать квиз
                            </Button>
                          </Box>
                        ) : (
                          <Stack sx={{ alignItems: "stretch" }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                flexShrink: 0,
                                width: "100%",
                              }}
                            >
                              <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                size="small"
                                onClick={addSubQuizSheet}
                              >
                                квиз
                              </Button>
                            </Box>
                            <Stack spacing={3} sx={{ width: "100%", mt: 1.5 }}>
                              {subQuizSheets.map((sq) => {
                                const quizIndexMap = buildQuestionIndexMapForSubQuiz(
                                  questionForms,
                                  sq.id,
                                );
                                const quizQuestions = quizIndexMap
                                  .map((i) => questionForms[i])
                                  .filter(Boolean);
                                const qSel = quizIndexMap.indexOf(selectedQuestionIndex);
                                const quizHasQuestions = quizIndexMap.length > 0;
                                const activeLocalIndex = quizQuestions.findIndex((q) =>
                                  Boolean(q?.isActive),
                                );
                                return (
                                  <Accordion
                                    key={sq.id}
                                    disableGutters
                                    expanded={expandedSubQuizId === sq.id}
                                    onChange={(_, expanded) =>
                                      setExpandedSubQuizId(expanded ? sq.id : false)
                                    }
                                  >
                                    <AccordionSummary
                                      component="div"
                                      expandIcon={<ExpandMoreIcon />}
                                      sx={{
                                        pt: 2.5,
                                        pb: 2,
                                        "& .MuiAccordionSummary-content": {
                                          alignItems: "center",
                                          gap: 1,
                                          flexGrow: 1,
                                          marginTop: 0,
                                          marginBottom: 0,
                                          minWidth: 0,
                                        },
                                      }}
                                    >
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ flex: 1, minWidth: 0 }}
                                      >
                                        <TextField
                                          size="small"
                                          label="Название квиза"
                                          value={sq.title}
                                          onChange={(e) => {
                                            const title = e.target.value;
                                            setSubQuizSheets((prev) =>
                                              prev.map((s) =>
                                                s.id === sq.id ? { ...s, title } : s,
                                              ),
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onFocus={(e) => e.stopPropagation()}
                                          sx={{ flex: 1, maxWidth: 480, minWidth: 0 }}
                                        />
                                        <Tooltip title="Удалить квиз" enterTouchDelay={400}>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            aria-label="Удалить квиз"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.info("[admin][subquiz-delete] click", {
                                                subQuizId: sq.id,
                                              });
                                              requestRemoveSubQuizSheet(sq.id);
                                            }}
                                          >
                                            <DeleteOutlineIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ pt: 0, px: 0, pb: 2 }}>
                                      {quizHasQuestions ? (
                                        <Stack spacing={1.25}>
                                          <AdminQuestionsSection
                                            listTitle="Вопросы квиза"
                                            listHeaderPrimaryAction={{
                                              label: "Статистика",
                                              to: `/admin/${eventName}/sub-quizzes/${sq.id}/results`,
                                            }}
                                            addButtonLabel="Вопрос"
                                            questionForms={quizIndexMap.map(
                                              (i) => questionForms[i],
                                            )}
                                            selectedListIndex={qSel < 0 ? 0 : qSel}
                                            remapQuestionIndex={(local) => quizIndexMap[local] ?? 0}
                                            eventName={eventName}
                                            expandedQuestionSettingsIndex={
                                              expandedQuestionSettingsIndex
                                            }
                                            setExpandedQuestionSettingsIndex={
                                              setExpandedQuestionSettingsIndex
                                            }
                                            questionResults={questionResults}
                                            publicViewMode={publicViewMode}
                                            publicViewQuestionId={publicViewQuestionId}
                                            setMessage={setMessage}
                                            openQuestionDialog={openQuestionDialog}
                                            addQuestion={() => addQuestionToSubQuiz(sq.id)}
                                            setPublicResultsView={setPublicResultsView}
                                            updateQuestionShowVoteCount={
                                              updateQuestionShowVoteCount
                                            }
                                            updateQuestionShowCorrectOption={
                                              updateQuestionShowCorrectOption
                                            }
                                            openTagInputDialog={openTagInputDialog}
                                            openTagResultsDialog={openTagResultsDialog}
                                            confirmResetQuestionAnswersByIndex={
                                              confirmResetQuestionAnswersByIndex
                                            }
                                            toggleQuestion={toggleQuestion}
                                            updateQuestionProjectorShowFirstCorrect={
                                              updateQuestionProjectorShowFirstCorrect
                                            }
                                            patchQuestionProjectorFirstCorrectWinnersCount={
                                              patchQuestionProjectorFirstCorrectWinnersCount
                                            }
                                            commitQuestionProjectorFirstCorrectWinnersCount={
                                              commitQuestionProjectorFirstCorrectWinnersCount
                                            }
                                            updateQuestionRankingProjectorMetric={
                                              updateQuestionRankingProjectorMetric
                                            }
                                            showFirstCorrectAnswerer={showFirstCorrectAnswerer}
                                            updateShowFirstCorrectAnswerer={
                                              updateShowFirstCorrectAnswerer
                                            }
                                            questionRevealStage={questionRevealStage}
                                            setQuestionRevealStageForQuestion={
                                              setQuestionRevealStageForQuestion
                                            }
                                            playerVisibleResultQuestionIds={
                                              playerVisibleResultQuestionIds
                                            }
                                            togglePlayerVisibleResultQuestionId={
                                              togglePlayerVisibleResultQuestionId
                                            }
                                          />
                                          <SubQuizControlsCard
                                            activeLocalIndex={activeLocalIndex}
                                            quizIndexMap={quizIndexMap}
                                            quizId={quizId}
                                            questionFlowMode={sq.questionFlowMode ?? "manual"}
                                            onChangeQuestionFlowMode={(mode) =>
                                              setSubQuizSheets((prev) => {
                                                const current = prev.find(
                                                  (item) => item.id === sq.id,
                                                );
                                                const next = prev.map((item) =>
                                                  item.id === sq.id
                                                    ? { ...item, questionFlowMode: mode }
                                                    : item,
                                                );
                                                if (
                                                  current?.questionFlowMode === "auto" &&
                                                  mode === "manual" &&
                                                  quizId
                                                ) {
                                                  socket.emit("sub-quiz:close", {
                                                    quizId,
                                                    subQuizId: sq.id,
                                                  });
                                                }
                                                return next;
                                              })
                                            }
                                            onStartAuto={() => {
                                              if (!quizId) return;
                                              socket.emit("sub-quiz:start-auto", {
                                                quizId,
                                                subQuizId: sq.id,
                                              });
                                            }}
                                            isLeaderboardShown={publicViewMode === "leaderboard"}
                                            firstCorrectWinnersCount={firstCorrectWinnersCount}
                                            highlightedLeadersCount={highlightedLeadersCount}
                                            onPrev={() => {
                                              if (activeLocalIndex <= 0) return;
                                              const prevGlobalIndex =
                                                quizIndexMap[activeLocalIndex - 1];
                                              if (prevGlobalIndex == null) return;
                                              toggleQuestion(prevGlobalIndex, true);
                                            }}
                                            onNext={() => {
                                              if (activeLocalIndex < 0) {
                                                const firstGlobalIndex = quizIndexMap[0];
                                                if (firstGlobalIndex == null) return;
                                                toggleQuestion(firstGlobalIndex, true);
                                                return;
                                              }
                                              const nextGlobalIndex =
                                                quizIndexMap[activeLocalIndex + 1];
                                              if (nextGlobalIndex == null) {
                                                if (!quizId) return;
                                                socket.emit("sub-quiz:close", {
                                                  quizId,
                                                  subQuizId: sq.id,
                                                });
                                                return;
                                              }
                                              toggleQuestion(nextGlobalIndex, true);
                                            }}
                                            onFinish={() => {
                                              if (!quizId) return;
                                              socket.emit("sub-quiz:close", {
                                                quizId,
                                                subQuizId: sq.id,
                                              });
                                            }}
                                            onToggleResults={() =>
                                              setPublicResultsView(
                                                publicViewMode === "leaderboard"
                                                  ? "title"
                                                  : "leaderboard",
                                              )
                                            }
                                            onChangeLeadersTop={(next) =>
                                              setFirstCorrectWinnersCount(
                                                Math.max(1, Math.min(20, next)),
                                              )
                                            }
                                            onCommitLeadersTop={updateFirstCorrectWinnersCount}
                                            onChangeResultsUsers={(next) =>
                                              setHighlightedLeadersCount(next)
                                            }
                                            onCommitResultsUsers={updateHighlightedLeaders}
                                          />
                                        </Stack>
                                      ) : (
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minHeight: 200,
                                            py: 4,
                                            px: 2,
                                          }}
                                        >
                                          <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={<QuizIcon sx={{ fontSize: 28 }} />}
                                            onClick={() => addQuestionToSubQuiz(sq.id)}
                                            sx={{
                                              py: 2,
                                              px: 4,
                                              fontSize: "1.1rem",
                                              borderRadius: 2,
                                              boxShadow: 2,
                                              textTransform: "none",
                                            }}
                                          >
                                            Вопрос
                                          </Button>
                                        </Box>
                                      )}
                                    </AccordionDetails>
                                  </Accordion>
                                );
                              })}
                            </Stack>
                          </Stack>
                        ))}
                      {roomQuestionsTab === "votes" &&
                        (votesIndexMap.length === 0 ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 280,
                              py: 6,
                              px: 2,
                            }}
                          >
                            <Button
                              variant="contained"
                              size="large"
                              startIcon={<HowToVoteIcon sx={{ fontSize: 28 }} />}
                              onClick={() => addQuestionToSubQuiz(null)}
                              sx={{
                                py: 2,
                                px: 4,
                                fontSize: "1.1rem",
                                borderRadius: 2,
                                boxShadow: 2,
                              }}
                            >
                              Создать голосование
                            </Button>
                          </Box>
                        ) : (
                          <Stack spacing={1.5}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                flexShrink: 0,
                                width: "100%",
                              }}
                            >
                              <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                size="small"
                                onClick={() => addQuestionToSubQuiz(null)}
                              >
                                Голосование
                              </Button>
                            </Box>
                            <AdminQuestionsSection
                              listTitle=""
                              addButtonLabel="Добавить голосование"
                              listHeaderShowAddButton={false}
                              questionForms={votesIndexMap.map((i) => questionForms[i])}
                              selectedListIndex={votesSelectedListIndex}
                              remapQuestionIndex={(local) => votesIndexMap[local] ?? 0}
                              eventName={eventName}
                              expandedQuestionSettingsIndex={expandedQuestionSettingsIndex}
                              setExpandedQuestionSettingsIndex={setExpandedQuestionSettingsIndex}
                              questionResults={questionResults}
                              publicViewMode={publicViewMode}
                              publicViewQuestionId={publicViewQuestionId}
                              setMessage={setMessage}
                              openQuestionDialog={openQuestionDialog}
                              addQuestion={() => addQuestionToSubQuiz(null)}
                              setPublicResultsView={setPublicResultsView}
                              updateQuestionShowVoteCount={updateQuestionShowVoteCount}
                              updateQuestionShowCorrectOption={updateQuestionShowCorrectOption}
                              openTagInputDialog={openTagInputDialog}
                              openTagResultsDialog={openTagResultsDialog}
                              confirmResetQuestionAnswersByIndex={
                                confirmResetQuestionAnswersByIndex
                              }
                              toggleQuestion={toggleQuestion}
                              updateQuestionProjectorShowFirstCorrect={
                                updateQuestionProjectorShowFirstCorrect
                              }
                              patchQuestionProjectorFirstCorrectWinnersCount={
                                patchQuestionProjectorFirstCorrectWinnersCount
                              }
                              commitQuestionProjectorFirstCorrectWinnersCount={
                                commitQuestionProjectorFirstCorrectWinnersCount
                              }
                              updateQuestionRankingProjectorMetric={
                                updateQuestionRankingProjectorMetric
                              }
                              showFirstCorrectAnswerer={showFirstCorrectAnswerer}
                              updateShowFirstCorrectAnswerer={updateShowFirstCorrectAnswerer}
                              questionRevealStage={questionRevealStage}
                              setQuestionRevealStageForQuestion={setQuestionRevealStageForQuestion}
                              playerVisibleResultQuestionIds={playerVisibleResultQuestionIds}
                              togglePlayerVisibleResultQuestionId={
                                togglePlayerVisibleResultQuestionId
                              }
                            />
                          </Stack>
                        ))}
                      {roomQuestionsTab === "randomizer" && (
                        <AdminRandomizerSection
                          mode={randomizerMode}
                          listMode={randomizerListMode}
                          title={randomizerTitle}
                          namesText={randomizerNamesText}
                          participantsNamesText={eventParticipantNicknames.join("\n")}
                          minNumber={randomizerMinNumber}
                          maxNumber={randomizerMaxNumber}
                          winnersCount={randomizerWinnersCount}
                          excludeWinners={randomizerExcludeWinners}
                          currentWinners={randomizerCurrentWinners}
                          history={randomizerHistory}
                          projectorMode={publicViewMode === "randomizer"}
                          isRunning={randomizerIsRunning}
                          onModeChange={(next) => {
                            setRandomizerMode(next);
                            emitPublicViewSet({ randomizerMode: next });
                          }}
                          onListModeChange={(next) => {
                            setRandomizerListMode(next);
                            emitPublicViewSet({
                              randomizerListMode: next,
                              randomizerNamesText:
                                next === "participants_only"
                                  ? eventParticipantNicknames.join("\n")
                                  : randomizerNamesText,
                            });
                          }}
                          onTitleChange={(next) => {
                            setRandomizerTitle(next);
                          }}
                          onTitleCommit={() => {
                            emitPublicViewSet({ randomizerTitle });
                          }}
                          onNamesTextChange={(next) => {
                            randomizerNamesEditedRef.current = true;
                            setRandomizerNamesText(next);
                            if (randomizerListMode === "free_list") {
                              emitPublicViewSet({ randomizerNamesText: next });
                            }
                          }}
                          onMinNumberChange={(next) => {
                            setRandomizerMinNumber(Math.trunc(next || 0));
                            emitPublicViewSet({ randomizerMinNumber: Math.trunc(next || 0) });
                          }}
                          onMaxNumberChange={(next) => {
                            setRandomizerMaxNumber(Math.trunc(next || 0));
                            emitPublicViewSet({ randomizerMaxNumber: Math.trunc(next || 0) });
                          }}
                          onWinnersCountChange={(next) => {
                            const clamped = Math.max(1, Math.trunc(next || 1));
                            setRandomizerWinnersCount(clamped);
                            emitPublicViewSet({ randomizerWinnersCount: clamped });
                          }}
                          onExcludeWinnersChange={(next) => {
                            setRandomizerExcludeWinners(next);
                            emitPublicViewSet({ randomizerExcludeWinners: next });
                          }}
                          onRun={runRandomizer}
                          onReset={resetRandomizer}
                          onClearScreen={clearRandomizerScreenData}
                          onToggleProjector={() => {
                            if (publicViewMode === "randomizer") {
                              setPublicResultsView("title");
                              return;
                            }
                            setPublicResultsView("randomizer");
                          }}
                        />
                      )}
                      {roomQuestionsTab === "reactions" && (
                        <AdminReactionsSection
                          widgets={reactionWidgets}
                          session={reactionSession}
                          widgetStatsById={reactionWidgetStatsById}
                          activeWidgetId={activeReactionWidgetId}
                          projectorWidgetId={projectorReactionWidgetId}
                          projectorMode={publicViewMode === "reactions"}
                          overlayText={reactionsOverlayText}
                          setOverlayText={(next) => {
                            setReactionsOverlayText(next);
                            emitPublicViewSet({ reactionsOverlayText: next });
                          }}
                          onCreateWidget={(title, reactionsText) => {
                            const reactions = parseReactionLines(reactionsText);
                            if (reactions.length === 0) {
                              setMessage("Добавьте хотя бы одну реакцию для виджета");
                              return;
                            }
                            setReactionWidgets((prev) => {
                              const nextWidgets = [
                                ...prev,
                                {
                                  id: `reaction_widget_${crypto.randomUUID()}`,
                                  title: title.trim() || `Виджет ${prev.length + 1}`,
                                  reactions,
                                },
                              ];
                              emitPublicViewSet({ reactionsWidgets: nextWidgets });
                              return nextWidgets;
                            });
                            setMessage("Виджет реакций создан");
                          }}
                          onUpdateWidget={(widgetId, title, reactionsText) => {
                            const reactions = parseReactionLines(reactionsText);
                            if (reactions.length === 0) {
                              setMessage("Добавьте хотя бы одну реакцию для виджета");
                              return;
                            }
                            setReactionWidgets((prev) => {
                              const target = prev.find((item) => item.id === widgetId);
                              if (!target) return prev;
                              const nextWidgets = prev.map((item) =>
                                item.id === widgetId
                                  ? {
                                      ...item,
                                      title: title.trim() || target.title,
                                      reactions,
                                    }
                                  : item,
                              );
                              if (
                                activeReactionWidgetId === widgetId &&
                                reactionSession?.isActive
                              ) {
                                const updated = nextWidgets.find((item) => item.id === widgetId);
                                if (updated && quizId) {
                                  socket.emit("reactions:start", {
                                    quizId,
                                    durationSec: 3600,
                                    reactions: updated.reactions,
                                  });
                                }
                              }
                              emitPublicViewSet({ reactionsWidgets: nextWidgets });
                              return nextWidgets;
                            });
                            setMessage("Виджет реакций обновлен");
                          }}
                          onDeleteWidget={(widgetId) => {
                            setReactionWidgets((prev) => {
                              const nextWidgets = prev.filter((item) => item.id !== widgetId);
                              emitPublicViewSet({ reactionsWidgets: nextWidgets });
                              return nextWidgets;
                            });
                            if (activeReactionWidgetId === widgetId) {
                              setActiveReactionWidgetId(null);
                            }
                            if (projectorReactionWidgetId === widgetId) {
                              setProjectorReactionWidgetId(null);
                              if (publicViewMode === "reactions") {
                                setPublicResultsView("title");
                              }
                            }
                            setMessage("Виджет реакций удален");
                          }}
                          onStartWidget={(widget) => {
                            if (!quizId) return;
                            socket.emit("reactions:start", {
                              quizId,
                              durationSec: 3600,
                              reactions: widget.reactions,
                            });
                            const nextOverlayText = widget.title.trim() || "Реакции аудитории";
                            setReactionsOverlayText(nextOverlayText);
                            emitPublicViewSet({ reactionsOverlayText: nextOverlayText });
                            setActiveReactionWidgetId(widget.id);
                            setMessage("Реакции запущены");
                          }}
                          onStop={() => {
                            if (!quizId) return;
                            socket.emit("reactions:stop", { quizId });
                            setActiveReactionWidgetId(null);
                            setMessage("Реакции остановлены");
                          }}
                          onToggleProjector={(widget) => {
                            const isSameWidgetOnProjector =
                              publicViewMode === "reactions" &&
                              projectorReactionWidgetId === widget.id;
                            if (isSameWidgetOnProjector) {
                              setProjectorReactionWidgetId(null);
                              setPublicResultsView("title");
                              return;
                            }
                            setProjectorReactionWidgetId(widget.id);
                            const nextOverlayText = widget.title.trim() || "Реакции аудитории";
                            setReactionsOverlayText(nextOverlayText);
                            if (quizId) {
                              setPublicResultsView("reactions", undefined, {
                                reactionsOverlayText: nextOverlayText,
                              });
                              return;
                            }
                            setPublicResultsView("reactions");
                          }}
                        />
                      )}
                    </Box>
                  </Paper>
                </Stack>
              )}

              {activeSection === "speakers" && (
                <AdminSpeakersSection
                  settings={speakerQuestionsAdminSettings}
                  panelActions={{
                    onToggleEnabled: setSpeakerQuestionsEnabled,
                    onReactionsTextChange: setSpeakerQuestionsReactionsText,
                    onToggleShowAuthorOnScreen: setSpeakerQuestionsShowAuthorOnScreen,
                    onToggleShowRecipientOnScreen: setSpeakerQuestionsShowRecipientOnScreen,
                    onToggleShowReactionsOnScreen: setSpeakerQuestionsShowReactionsOnScreen,
                    onSpeakersTextChange: setSpeakerListText,
                    onSaveSettings: saveSpeakerSettingsAndOpenProjector,
                  }}
                  questions={speakerQuestionsPayload?.items ?? []}
                  onHide={hideSpeakerQuestion}
                  onRestore={restoreSpeakerQuestion}
                  onSetUserVisible={setSpeakerQuestionUserVisible}
                  onSetOnScreen={setSpeakerQuestionOnScreenAndOpenProjector}
                  onUpdateQuestionText={updateSpeakerQuestionText}
                  onDeleteQuestion={deleteSpeakerQuestion}
                />
              )}

              {activeSection === "banners" && (
                <AdminBannersSection
                  banners={playerBanners}
                  onCreate={createPlayerBanner}
                  onUpdate={updatePlayerBanner}
                  speakerTileText={speakerTileText}
                  speakerTileBackgroundColor={speakerTileBackgroundColor}
                  speakerTileVisible={speakerTileVisible}
                  onSaveSpeakerTile={saveSpeakerTile}
                  onToggleSpeakerTileVisible={toggleSpeakerTileVisible}
                  programTileText={programTileText}
                  programTileBackgroundColor={programTileBackgroundColor}
                  programTileLinkUrl={programTileLinkUrl}
                  programTileVisible={programTileVisible}
                  onSaveProgramTile={saveProgramTile}
                  onToggleProgramTileVisible={toggleProgramTileVisible}
                  tilesOrder={playerTilesOrder}
                  onMoveTileUp={(id) => moveTile(id, -1)}
                  onMoveTileDown={(id) => moveTile(id, 1)}
                  onUploadMedia={async (file) => {
                    try {
                      return await uploadBannerMedia(file);
                    } catch (error) {
                      setMessage(
                        error instanceof Error ? error.message : "Не удалось загрузить файл",
                      );
                      throw error;
                    }
                  }}
                  onToggleVisible={togglePlayerBannerVisible}
                  onDelete={deletePlayerBanner}
                />
              )}

              {activeSection === "branding" && (
                <AdminBrandingSection
                  projectorBackground={projectorBackground}
                  setProjectorBackground={setProjectorBackground}
                  brandBodyBackgroundColor={brandBodyBackgroundColor}
                  setBrandBodyBackgroundColor={setBrandBodyBackgroundColor}
                  voteQuestionTextColor={voteQuestionTextColor}
                  setVoteQuestionTextColor={setVoteQuestionTextColor}
                  voteOptionTextColor={voteOptionTextColor}
                  setVoteOptionTextColor={setVoteOptionTextColor}
                  voteProgressTrackColor={voteProgressTrackColor}
                  setVoteProgressTrackColor={setVoteProgressTrackColor}
                  voteProgressBarColor={voteProgressBarColor}
                  setVoteProgressBarColor={setVoteProgressBarColor}
                  cloudQuestionColor={cloudQuestionColor}
                  setCloudQuestionColor={setCloudQuestionColor}
                  cloudTopTagColor={cloudTopTagColor}
                  setCloudTopTagColor={setCloudTopTagColor}
                  cloudCorrectTagColor={cloudCorrectTagColor}
                  setCloudCorrectTagColor={setCloudCorrectTagColor}
                  cloudTagColors={cloudTagColors}
                  setCloudTagColors={setCloudTagColors}
                  cloudDensity={cloudDensity}
                  setCloudDensity={setCloudDensity}
                  cloudTagPadding={cloudTagPadding}
                  setCloudTagPadding={setCloudTagPadding}
                  cloudSpiral={cloudSpiral}
                  setCloudSpiral={setCloudSpiral}
                  cloudAnimationStrength={cloudAnimationStrength}
                  setCloudAnimationStrength={setCloudAnimationStrength}
                  brandPrimaryColor={brandPrimaryColor}
                  setBrandPrimaryColor={setBrandPrimaryColor}
                  brandAccentColor={brandAccentColor}
                  setBrandAccentColor={setBrandAccentColor}
                  brandSurfaceColor={brandSurfaceColor}
                  setBrandSurfaceColor={setBrandSurfaceColor}
                  brandTextColor={brandTextColor}
                  setBrandTextColor={setBrandTextColor}
                  brandFontFamily={brandFontFamily}
                  setBrandFontFamily={setBrandFontFamily}
                  setBrandFontUrl={setBrandFontUrl}
                  availableFonts={availableFonts}
                  onUploadFont={uploadCustomFont}
                  onUploadFontError={setMessage}
                  brandLogoUrl={brandLogoUrl}
                  setBrandLogoUrl={setBrandLogoUrl}
                  brandPlayerBackgroundImageUrl={brandPlayerBackgroundImageUrl}
                  setBrandPlayerBackgroundImageUrl={setBrandPlayerBackgroundImageUrl}
                  brandProjectorBackgroundImageUrl={brandProjectorBackgroundImageUrl}
                  setBrandProjectorBackgroundImageUrl={setBrandProjectorBackgroundImageUrl}
                  onUploadMedia={uploadBannerMedia}
                  emitBrandingPatch={emitBrandingPatch}
                />
              )}

              {activeSection === "results" && (
                <AdminResultsSection
                  leaderboardSort={leaderboardSort}
                  setLeaderboardSort={setLeaderboardSort}
                  displayedLeaderboard={displayedLeaderboard}
                  exportLeaderboardCsv={exportLeaderboardCsv}
                  subQuizLeaderboardOptions={leaderboardsBySubQuiz.map((x) => ({
                    subQuizId: x.subQuizId,
                    title: x.title,
                  }))}
                  selectedResultsSubQuizId={resultsSubQuizId}
                  onSelectResultsSubQuiz={setResultsSubQuizId}
                />
              )}
              {activeSection === "report" && (
                <AdminReportSection
                  reportTitle={reportTitle}
                  onReportTitleChange={setReportTitle}
                  onReportTitleCommit={() => emitPublicViewSet({ reportTitle })}
                  reportModules={reportModules}
                  onToggleModule={toggleReportModule}
                  onMoveModule={moveReportModule}
                  availableQuizQuestions={availableQuizQuestions}
                  selectedQuizIds={reportQuizSubQuizIds}
                  selectedQuizQuestionIds={reportQuizQuestionIds}
                  onToggleQuiz={toggleReportQuiz}
                  onToggleQuizQuestion={toggleReportQuizQuestion}
                  reportSubQuizHideParticipantTableIds={reportSubQuizHideParticipantTableIds}
                  onToggleSubQuizParticipantTable={toggleReportSubQuizParticipantTable}
                  randomizerHistory={randomizerHistory}
                  randomizerCurrentWinners={randomizerCurrentWinners}
                  reportRandomizerRunIds={reportRandomizerRunIds}
                  onToggleRandomizerRun={toggleReportRandomizerRun}
                  reactionWidgets={reactionWidgets}
                  reportReactionsWidgetIds={reportReactionsWidgetIds}
                  onToggleReactionsWidget={toggleReportReactionsWidget}
                  speakerQuestionsForReport={speakerQuestionsPayload?.items ?? []}
                  reportSpeakerQuestionIds={reportSpeakerQuestionIds}
                  onToggleSpeakerQuestion={toggleReportSpeakerQuestion}
                  availableVoteQuestions={availableVoteQuestions}
                  selectedVoteQuestionIds={reportVoteQuestionIds}
                  onToggleVoteQuestion={toggleReportVoteQuestion}
                  reportPublished={reportPublished}
                  onTogglePublished={(next) => {
                    setReportPublished(next);
                    emitPublicViewSet({ reportPublished: next });
                    setMessage(next ? "Публичный отчет опубликован" : "Публичный отчет скрыт");
                  }}
                  publicReportUrl={`${APP_ORIGIN}/report/${room.slug}`}
                  pdfReportUrl={`${API_BASE}/api/quiz/by-slug/${encodeURIComponent(room.slug)}/public-report.pdf`}
                />
              )}
              {activeSection === "danger" && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="error" gutterBottom>
                      Опасные действия
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                      <Button onClick={resetAllAnswers} color="warning" variant="contained">
                        Обнулить все ответы
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
      {isAuth && !room && <Alert severity="warning">Комната не найдена.</Alert>}
      <Dialog
        open={isQuestionDialogOpen}
        onClose={() => cancelQuestionDialog()}
        maxWidth="sm"
        fullWidth
        aria-label="Редактор вопроса"
      >
        <DialogTitle
          sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 1, px: 1 }}
        >
          <IconButton
            onClick={cancelQuestionDialog}
            size="small"
            aria-label="Закрыть без сохранения"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {questionForms[selectedQuestionIndex] && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {!!questionDialogError && (
                <Alert severity="error" onClose={() => setQuestionDialogError("")}>
                  {questionDialogError}
                </Alert>
              )}
              <Stack spacing={2}>
                <TextField
                  label="Текст вопроса"
                  value={questionForms[selectedQuestionIndex].text}
                  onChange={(e) => updateQuestion(selectedQuestionIndex, { text: e.target.value })}
                  fullWidth
                  size="small"
                  multiline
                  minRows={1}
                  maxRows={12}
                />
                {questionForms[selectedQuestionIndex].type === "ranking" && (
                  <TextField
                    size="small"
                    label="Подсказка игроку (ранжирование)"
                    value={questionForms[selectedQuestionIndex].rankingPlayerHint ?? ""}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex, {
                        rankingPlayerHint: e.target.value,
                      })
                    }
                    helperText="Необязательно. Если пусто — показывается стандартная подсказка."
                    placeholder="Например: Расставьте варианты по стоимости от большей к меньшей."
                    multiline
                    minRows={1}
                    maxRows={3}
                    fullWidth
                  />
                )}
              </Stack>
              <Divider />

              {(questionForms[selectedQuestionIndex].type !== "tag_cloud" ||
                isEditorQuizMode(questionForms[selectedQuestionIndex])) && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    {questionForms[selectedQuestionIndex].type === "tag_cloud"
                      ? "Эталонные теги"
                      : questionForms[selectedQuestionIndex].type === "ranking"
                        ? questionForms[selectedQuestionIndex].rankingKind === "quiz"
                          ? "Варианты (для квиза эталон задаётся в колонке «Эталон (место)»)"
                          : "Варианты (для жюри эталон не используется)"
                        : "Варианты ответов"}
                  </Typography>
                  <Stack spacing={1.25}>
                    {questionForms[selectedQuestionIndex].options.map((option, oIndex) => (
                      <Stack
                        key={`q-${selectedQuestionIndex}-o-${oIndex}`}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                        sx={{ width: "100%", minWidth: 0 }}
                      >
                        <TextField
                          label={
                            questionForms[selectedQuestionIndex].type === "tag_cloud"
                              ? `Тег ${oIndex + 1}`
                              : `Вариант ${oIndex + 1}`
                          }
                          value={option.text}
                          onChange={(e) =>
                            updateOption(selectedQuestionIndex, oIndex, { text: e.target.value })
                          }
                          size="small"
                          multiline
                          minRows={1}
                          maxRows={8}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                        {questionForms[selectedQuestionIndex].type === "ranking" && (
                          <TextField
                            type="number"
                            size="small"
                            label={
                              questionForms[selectedQuestionIndex].rankingKind === "jury"
                                ? `${oIndex + 1}-е место`
                                : "Эталон (место)"
                            }
                            inputProps={{
                              min:
                                questionForms[selectedQuestionIndex].rankingKind === "jury" ? 0 : 1,
                              max:
                                questionForms[selectedQuestionIndex].rankingKind === "jury"
                                  ? 10000
                                  : questionForms[selectedQuestionIndex].options.length,
                              "aria-label":
                                questionForms[selectedQuestionIndex].rankingKind === "jury"
                                  ? `Балл за ${oIndex + 1}-е место`
                                  : `Место варианта ${oIndex + 1} в скрытом эталоне`,
                            }}
                            value={
                              questionForms[selectedQuestionIndex].rankingPointsByRank?.[oIndex] ??
                              ""
                            }
                            onChange={(e) =>
                              setRankingTierAt(selectedQuestionIndex, oIndex, e.target.value)
                            }
                            sx={{ width: 118, flexShrink: 0 }}
                          />
                        )}
                        {isEditorQuizMode(questionForms[selectedQuestionIndex]) &&
                          questionForms[selectedQuestionIndex].type !== "tag_cloud" &&
                          questionForms[selectedQuestionIndex].type !== "ranking" && (
                            <Stack
                              direction="row"
                              spacing={0}
                              sx={{ flexShrink: 0, pt: 0.5 }}
                              aria-label="Правильность ответа"
                            >
                              <Tooltip title="Правильный">
                                <IconButton
                                  size="small"
                                  color={option.isCorrect ? "success" : "default"}
                                  onClick={() => {
                                    updateOption(selectedQuestionIndex, oIndex, {
                                      isCorrect: true,
                                    });
                                  }}
                                  aria-pressed={option.isCorrect}
                                  aria-label="Отметить как правильный"
                                >
                                  <CheckCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Неверный">
                                <IconButton
                                  size="small"
                                  color={!option.isCorrect ? "error" : "default"}
                                  onClick={() => {
                                    updateOption(selectedQuestionIndex, oIndex, {
                                      isCorrect: false,
                                    });
                                  }}
                                  aria-pressed={!option.isCorrect}
                                  aria-label="Отметить как неверный"
                                >
                                  <HighlightOffOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        <IconButton
                          onClick={() => removeOption(selectedQuestionIndex, oIndex)}
                          disabled={
                            questionForms[selectedQuestionIndex].type === "tag_cloud" &&
                            isEditorQuizMode(questionForms[selectedQuestionIndex])
                              ? questionForms[selectedQuestionIndex].options.length <= 1
                              : questionForms[selectedQuestionIndex].type === "ranking"
                                ? questionForms[selectedQuestionIndex].options.length <= 3
                                : questionForms[selectedQuestionIndex].options.length <= 2
                          }
                          sx={{ flexShrink: 0, mt: 0.5 }}
                          aria-label="Удалить вариант"
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                  <TextField
                    label="Новый вариант (введите и нажмите Enter)"
                    placeholder="Текст нового варианта"
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    onBlur={commitNewOption}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitNewOption();
                      }
                    }}
                    size="small"
                    fullWidth
                  />
                </>
              )}
              <Divider />
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField
                  select
                  label="Тип ответа"
                  value={getQuestionTypeSelectValue(questionForms[selectedQuestionIndex])}
                  onChange={(e) => {
                    const value = e.target.value as
                      | "single"
                      | "multi"
                      | "ranking"
                      | "tag_cloud"
                      | "poll";
                    if (value === "poll") {
                      updateQuestion(selectedQuestionIndex, {
                        type: "single",
                        editorQuizMode: false,
                        options: questionForms[selectedQuestionIndex].options.map((opt) => ({
                          ...opt,
                          isCorrect: false,
                        })),
                      });
                      return;
                    }
                    updateQuestion(selectedQuestionIndex, {
                      type: value as QuestionType,
                      editorQuizMode: true,
                    });
                  }}
                  size="small"
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="poll">Обычное голосование</MenuItem>
                  <MenuItem value="single">Один правильный</MenuItem>
                  <MenuItem value="multi">Несколько правильных</MenuItem>
                  <MenuItem value="ranking">Ранжирование</MenuItem>
                  <MenuItem value="tag_cloud">Облако тегов</MenuItem>
                </TextField>
                {questionForms[selectedQuestionIndex].type === "tag_cloud" ? (
                  <TextField
                    type="number"
                    label="Макс. ответов"
                    value={questionForms[selectedQuestionIndex].maxAnswers}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex, {
                        maxAnswers: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    size="small"
                    sx={{ minWidth: 140 }}
                    helperText="От 1 до 5"
                  />
                ) : null}
                {isEditorQuizMode(questionForms[selectedQuestionIndex]) &&
                  (questionForms[selectedQuestionIndex].type === "ranking"
                    ? questionForms[selectedQuestionIndex].subQuizId != null &&
                      questionForms[selectedQuestionIndex].rankingKind !== "jury"
                    : questionForms[selectedQuestionIndex].subQuizId != null) && (
                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{ width: { xs: "100%", md: "50%" }, minWidth: 220 }}
                    >
                      <TextField
                        type="number"
                        label={
                          questionForms[selectedQuestionIndex].type === "ranking"
                            ? "Баллы за полный ответ"
                            : "Баллы"
                        }
                        value={questionForms[selectedQuestionIndex].points}
                        onChange={(e) =>
                          updateQuestion(selectedQuestionIndex, {
                            points: Number(e.target.value) || 1,
                          })
                        }
                        size="small"
                        sx={{ flex: 1, minWidth: 0 }}
                      />
                    </Stack>
                  )}
              </Stack>
              {questionForms[selectedQuestionIndex].type === "ranking" && (
                <Stack spacing={1.25} sx={{ pt: 0.25 }}>
                  <Typography variant="overline" color="text.secondary">
                    Настройки ранжирования
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: "100%" }}>
                    <TextField
                      select
                      label="Режим"
                      value={questionForms[selectedQuestionIndex].rankingKind ?? "jury"}
                      onChange={(e) =>
                        updateQuestion(selectedQuestionIndex, {
                          rankingKind: e.target.value as "quiz" | "jury",
                          rankingPointsByRank:
                            (e.target.value as "quiz" | "jury") === "jury"
                              ? Array.from(
                                  { length: questionForms[selectedQuestionIndex].options.length },
                                  (_, j) =>
                                    Math.max(
                                      1,
                                      questionForms[selectedQuestionIndex].options.length - j,
                                    ),
                                )
                              : Array.from(
                                  { length: questionForms[selectedQuestionIndex].options.length },
                                  (_, j) => j + 1,
                                ),
                          rankingPlayerHint:
                            (questionForms[selectedQuestionIndex].rankingPlayerHint ?? "").trim()
                              .length > 0
                              ? questionForms[selectedQuestionIndex].rankingPlayerHint
                              : (e.target.value as "quiz" | "jury") === "quiz"
                                ? defaultRankingQuizHint
                                : defaultRankingJuryHint,
                        })
                      }
                      size="small"
                      sx={{ minWidth: 320, flex: 1 }}
                    >
                      <MenuItem value="quiz">Квиз (эталон и зачёт баллов)</MenuItem>
                      <MenuItem value="jury">Жюри (без эталона и без зачёта в таблице)</MenuItem>
                    </TextField>
                    <Tooltip
                      title={
                        questionForms[selectedQuestionIndex].rankingKind === "jury"
                          ? "Жюри: нет эталона и зачёта в таблице лидеров; баллы в колонке у строк задают награду за 1-е, 2-е… место в ответе (для сводки на проекторе)."
                          : "Квиз: засчитывается только полное совпадение порядка с эталоном."
                      }
                    >
                      <IconButton size="small" aria-label="Подсказка по режиму ранжирования">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  {questionForms[selectedQuestionIndex].rankingKind === "jury" ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Баллы у каждой строки — за 1-е, 2-е… место в ответе участника. Для жюри все
                        позиции должны быть заданы.
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => fillRankingTiersDescending(selectedQuestionIndex)}
                        >
                          Заполнить n…1
                        </Button>
                      </Stack>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Для квиза эталон задаётся в колонке «Эталон (место)». Участник видит варианты
                      в текущем порядке, а баллы начисляются только при полном совпадении со скрытым
                      эталоном.
                    </Typography>
                  )}
                  {questionForms[selectedQuestionIndex].id ? null : (
                    <TextField
                      select
                      label="Проектор: метрика"
                      value={
                        questionForms[selectedQuestionIndex].rankingProjectorMetric ?? "avg_score"
                      }
                      onChange={(e) =>
                        updateQuestion(selectedQuestionIndex, {
                          rankingProjectorMetric: e.target.value as
                            | "avg_rank"
                            | "avg_score"
                            | "total_score",
                        })
                      }
                      size="small"
                      sx={{ minWidth: 280 }}
                    >
                      <MenuItem value="avg_rank">Средний ранг</MenuItem>
                      <MenuItem value="avg_score">Средний балл (по варианту)</MenuItem>
                      <MenuItem value="total_score">Сумма баллов (по варианту)</MenuItem>
                    </TextField>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1,
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            onClick={() => requestRemoveQuestion(selectedQuestionIndex)}
          >
            Удалить вопрос
          </Button>
          <Button variant="contained" onClick={() => void saveQuestionDialogAndClose()}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={tagInputDialogQuestionIndex !== null}
        onClose={closeTagInputDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить ответы списком</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Формат строк: <code>слово 10</code> или <code>слово: 10</code>
            </Typography>
            <TextField
              size="small"
              multiline
              minRows={6}
              maxRows={12}
              value={
                tagInputDialogQuestionIndex !== null
                  ? (questionForms[tagInputDialogQuestionIndex]?.injectedTagsInput ?? "")
                  : ""
              }
              onChange={(e) => {
                if (tagInputDialogQuestionIndex === null) return;
                const value = e.target.value;
                setQuestionForms((prev) =>
                  prev.map((q, idx) =>
                    idx === tagInputDialogQuestionIndex ? { ...q, injectedTagsInput: value } : q,
                  ),
                );
              }}
              placeholder={"синий 10\nзеленый: 4\nкрасный (2)"}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTagInputDialog}>Отмена</Button>
          <Button variant="contained" onClick={applyInjectedTagListFromDialog}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={tagResultsDialogQuestionIndex !== null}
        onClose={closeTagResultsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Результаты облака тегов</DialogTitle>
        <DialogContent>
          <Stack spacing={0.5} sx={{ pt: 1 }}>
            {(() => {
              if (tagResultsDialogQuestionIndex === null) return null;
              const question = questionForms[tagResultsDialogQuestionIndex];
              if (!question) return null;
              const result = question.id
                ? questionResults.find((item) => item.questionId === question.id)
                : undefined;
              const tags = result?.tagCloud ?? [];
              const injected = question.injectedTagWords ?? [];
              const hiddenTags = question.hiddenTagTexts ?? [];
              const overrides = question.tagCountOverrides ?? [];
              const merged = new Map<string, number>();
              [...tags, ...injected].forEach((item) => {
                merged.set(item.text, (merged.get(item.text) ?? 0) + item.count);
              });
              overrides.forEach((item) => {
                merged.set(item.text, item.count);
              });
              const currentTags = Array.from(merged.entries())
                .map(([text, count]) => ({ text, count }))
                .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));
              const byText = new Map(currentTags.map((item) => [item.text, item]));
              const orderedTags = [
                ...tagResultsOrder
                  .map((text) => byText.get(text))
                  .filter((item): item is { text: string; count: number } => Boolean(item)),
                ...currentTags.filter((item) => !tagResultsOrder.includes(item.text)),
              ];
              if (orderedTags.length === 0) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    Пока нет ответов
                  </Typography>
                );
              }
              return orderedTags.map((tag) => (
                <Stack
                  key={`${question.id ?? tagResultsDialogQuestionIndex}-${tag.text}`}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="body2"
                    onClick={() => toggleTagVisibility(tagResultsDialogQuestionIndex, tag.text)}
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      cursor: "pointer",
                      textDecoration: hiddenTags.includes(tag.text) ? "line-through" : "none",
                      opacity: hiddenTags.includes(tag.text) ? 0.5 : 1,
                      pr: 1,
                      flex: 1,
                    }}
                  >
                    {tag.text}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() =>
                        updateTagCountOverride(
                          tagResultsDialogQuestionIndex,
                          tag.text,
                          tag.count - 1,
                        )
                      }
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={tag.count}
                      onChange={(e) =>
                        updateTagCountOverride(
                          tagResultsDialogQuestionIndex,
                          tag.text,
                          Number(e.target.value),
                        )
                      }
                      inputProps={{ min: 0, step: 1 }}
                      sx={{ width: 92 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() =>
                        updateTagCountOverride(
                          tagResultsDialogQuestionIndex,
                          tag.text,
                          tag.count + 1,
                        )
                      }
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              ));
            })()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTagResultsDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmResetQuestionIndex !== null}
        onClose={() => setConfirmResetQuestionIndex(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Подтверждение</DialogTitle>
        <DialogContent>
          <Typography>Обнулить ответы по этому вопросу?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetQuestionIndex(null)}>Отмена</Button>
          <Button color="warning" variant="contained" onClick={runConfirmedResetQuestionAnswers}>
            Обнулить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteSubQuizId !== null}
        onClose={closeDeleteSubQuizDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить квиз</DialogTitle>
        <DialogContent>
          <Typography>Удалить квиз? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteSubQuizDialog}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void runConfirmedRemoveSubQuiz()}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteQuestionIndex !== null}
        onClose={closeDeleteQuestionDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Удалить голосование</DialogTitle>
        <DialogContent>
          <Typography>Удалить это голосование? Это действие нельзя отменить.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteQuestionDialog}>Отмена</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void runConfirmedRemoveQuestion()}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmResetDemoOpen}
        onClose={() => setConfirmResetDemoOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Сбросить demo</DialogTitle>
        <DialogContent>
          <Typography>
            Сбросить ивент `demo` к тестовым данным? Все текущие изменения будут перезаписаны.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetDemoOpen(false)}>Отмена</Button>
          <Button color="error" variant="contained" onClick={() => void resetDemoToDefault()}>
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
