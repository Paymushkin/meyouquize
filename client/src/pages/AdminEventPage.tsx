import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
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
  Switch,
  Stack,
  Tab,
  Tabs,
  TextField,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PaletteIcon from "@mui/icons-material/Palette";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import QuizIcon from "@mui/icons-material/Quiz";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RemoveIcon from "@mui/icons-material/Remove";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";
import { AdminGeneralSection } from "../components/admin/AdminGeneralSection";
import { AdminQuestionsSection } from "../components/admin/AdminQuestionsSection";
import { AdminResultsSection } from "../components/admin/AdminResultsSection";
import { APP_ORIGIN } from "../config";
import {
  toBrandingState,
  type CloudManualStateByQuestion,
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
import { socket } from "../socket";
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

type AdminSection = "general" | "questions" | "branding" | "results" | "danger";

const ADMIN_BANNER_AUTO_HIDE_MS = 5000;
const RESULTS_UI_STORAGE_PREFIX = "mq_admin_results_ui_";

const ADMIN_NAV: {
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "general", label: "Общее", icon: <DashboardIcon fontSize="small" /> },
  { id: "questions", label: "Вопросы", icon: <QuizIcon fontSize="small" /> },
  { id: "results", label: "Результаты", icon: <LeaderboardIcon fontSize="small" /> },
  { id: "branding", label: "Брендирование", icon: <PaletteIcon fontSize="small" /> },
  { id: "danger", label: "Опасные", icon: <WarningAmberIcon fontSize="small" /> },
];

export function AdminEventPage() {
  const { eventName = "" } = useParams();
  const resultsUiStorageKey = `${RESULTS_UI_STORAGE_PREFIX}${eventName}`;
  const [isAuth, setIsAuth] = useState(false);
  const [room, setRoom] = useState<AdminEventRoom | null>(null);
  const [quizId, setQuizId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [subQuizSheets, setSubQuizSheets] = useState<SubQuizSheet[]>([]);
  const [roomQuestionsTab, setRoomQuestionsTab] = useState<"quizzes" | "votes">("quizzes");
  const [expandedSubQuizId, setExpandedSubQuizId] = useState<string | false>(false);
  const [questionForms, setQuestionForms] = useState<QuestionForm[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [leaderboardsBySubQuiz, setLeaderboardsBySubQuiz] = useState<SubQuizLeaderboardPayload[]>([]);
  const [resultsSubQuizId, setResultsSubQuizId] = useState<string>("");
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [confirmResetQuestionIndex, setConfirmResetQuestionIndex] = useState<number | null>(null);
  const [tagInputDialogQuestionIndex, setTagInputDialogQuestionIndex] = useState<number | null>(null);
  const [tagResultsDialogQuestionIndex, setTagResultsDialogQuestionIndex] = useState<number | null>(null);
  const [tagResultsOrder, setTagResultsOrder] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [expandedQuestionSettingsIndex, setExpandedQuestionSettingsIndex] = useState<number | null>(null);
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
  const [publicViewMode, setPublicViewMode] = useState<PublicViewMode>(() => {
    if (typeof window === "undefined") return "title";
    try {
      const raw = window.localStorage.getItem(resultsUiStorageKey);
      if (!raw) return "title";
      const parsed = JSON.parse(raw) as { publicViewMode?: PublicViewMode };
      return parsed.publicViewMode === "leaderboard" ? "leaderboard" : "title";
    } catch {
      return "title";
    }
  });
  const [publicViewQuestionId, setPublicViewQuestionId] = useState<string | undefined>(undefined);
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
  const [cloudTagColors, setCloudTagColors] = useState<string[]>(["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"]);
  const [cloudTopTagColor, setCloudTopTagColor] = useState("#d32f2f");
  const [cloudDensity, setCloudDensity] = useState(60);
  const [cloudTagPadding, setCloudTagPadding] = useState(5);
  const [cloudSpiral, setCloudSpiral] = useState<"archimedean" | "rectangular">("archimedean");
  const [cloudAnimationStrength, setCloudAnimationStrength] = useState(30);
  const [voteQuestionTextColor, setVoteQuestionTextColor] = useState("#1f1f1f");
  const [voteOptionTextColor, setVoteOptionTextColor] = useState("#1f1f1f");
  const [voteProgressTrackColor, setVoteProgressTrackColor] = useState("#e3e3e3");
  const [voteProgressBarColor, setVoteProgressBarColor] = useState("#1976d2");
  const [editableTitle, setEditableTitle] = useState("");
  const [message, setMessage] = useState("");
  /** Ошибка валидации/сети при сохранении из попапа редактора вопроса */
  const [questionDialogError, setQuestionDialogError] = useState("");
  const [qrData, setQrData] = useState("");
  const lastSavedSnapshotRef = useRef("");
  /** Снимок вопросов на момент открытия редактора (отмена восстанавливает) */
  const questionDialogSnapshotRef = useRef<QuestionForm[] | null>(null);
  const cloudManualSyncRef = useRef("");
  const cloudManualStorageKey = `mq_cloud_manual_${eventName}`;
  const syncedSubQuizIdsKeyRef = useRef("");

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

  function saveQuizTitle() {
    void saveQuizTitleApi(editableTitle, room?.title);
  }

  const joinUrl = useMemo(() => {
    if (!room) return "";
    return `${APP_ORIGIN}/q/${room.slug}`;
  }, [room]);

  const votesIndexMap = useMemo(
    () => buildQuestionIndexMapForSubQuiz(questionForms, null),
    [questionForms],
  );

  const votesSelectedListIndex = useMemo(() => {
    const si = votesIndexMap.indexOf(selectedQuestionIndex);
    return si < 0 ? 0 : si;
  }, [votesIndexMap, selectedQuestionIndex]);

  const subQuizIdsKey = useMemo(() => subQuizSheets.map((s) => s.id).join(","), [subQuizSheets]);

  useEffect(() => {
    syncedSubQuizIdsKeyRef.current = "";
  }, [eventName]);

  useEffect(() => {
    if (!subQuizIdsKey) {
      setExpandedSubQuizId(false);
      return;
    }
    if (subQuizIdsKey === syncedSubQuizIdsKeyRef.current) return;
    syncedSubQuizIdsKeyRef.current = subQuizIdsKey;
    setExpandedSubQuizId(computeFirstIncompleteSubQuizId(subQuizSheets, questionForms));
  }, [subQuizIdsKey, subQuizSheets, questionForms]);

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
      publicViewMode: publicViewMode === "leaderboard" ? "leaderboard" : "title",
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
    setHighlightedLeadersCount,
    setQuestionForms,
    setProjectorBackground,
    setCloudQuestionColor,
    setCloudTagColors,
    setCloudTopTagColor,
    setCloudDensity,
    setCloudTagPadding,
    setCloudSpiral,
    setCloudAnimationStrength,
    setVoteQuestionTextColor,
    setVoteOptionTextColor,
    setVoteProgressTrackColor,
    setVoteProgressBarColor,
    setShowFirstCorrectAnswerer,
    setFirstCorrectWinnersCount,
  });

  const { emitPublicViewSet, emitBrandingPatch } = usePublicViewEmitter({
    quizId,
    publicViewMode,
    publicViewQuestionId,
    highlightedLeadersCount,
    questionForms,
    projectorBackground,
    cloudQuestionColor,
    cloudTagColors,
    cloudTopTagColor,
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
  });

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
      setupSocketListeners();
    });
    return () => {
      clearSocketListeners();
    };
  }, [checkSession, clearSocketListeners, eventName, loadRoom, setupSocketListeners]);

  /** Подтянуть сохранённое на сервере состояние экрана (включая цвета) после loadRoom */
  useEffect(() => {
    if (!room?.publicView || typeof room.publicView !== "object") return;
    const pv = room.publicView;
    if (pv.mode === "title" || pv.mode === "question" || pv.mode === "leaderboard") {
      setPublicViewMode(pv.mode);
    }
    setPublicViewQuestionId(typeof pv.questionId === "string" ? pv.questionId : undefined);
    if (typeof pv.highlightedLeadersCount === "number") {
      setHighlightedLeadersCount(pv.highlightedLeadersCount);
    }
    const qid = typeof pv.questionId === "string" ? pv.questionId : undefined;
    if (qid) {
      setQuestionForms((prev) =>
        prev.map((q) => (q.id === qid
          ? {
            ...q,
            showVoteCount: pv.showVoteCount ?? q.showVoteCount ?? true,
            showQuestionTitle: pv.showQuestionTitle ?? q.showQuestionTitle ?? true,
            hiddenTagTexts: Array.isArray(pv.hiddenTagTexts) ? pv.hiddenTagTexts : (q.hiddenTagTexts ?? []),
            injectedTagWords: Array.isArray(pv.injectedTagWords) ? pv.injectedTagWords : (q.injectedTagWords ?? []),
            tagCountOverrides: Array.isArray(pv.tagCountOverrides) ? pv.tagCountOverrides : (q.tagCountOverrides ?? []),
          }
          : q)),
      );
    }
    const b = toBrandingState(pv);
    setProjectorBackground(b.projectorBackground);
    setCloudQuestionColor(b.cloudQuestionColor);
    setCloudTagColors(b.cloudTagColors);
    setCloudTopTagColor(b.cloudTopTagColor);
    setCloudDensity(Math.max(0, Math.min(100, Math.trunc(b.cloudDensity))));
    setCloudTagPadding(Math.max(0, Math.min(40, Math.trunc(b.cloudTagPadding))));
    setCloudSpiral(b.cloudSpiral);
    setCloudAnimationStrength(Math.max(0, Math.min(100, Math.trunc(b.cloudAnimationStrength))));
    setVoteQuestionTextColor(b.voteQuestionTextColor);
    setVoteOptionTextColor(b.voteOptionTextColor);
    setVoteProgressTrackColor(b.voteProgressTrackColor);
    setVoteProgressBarColor(b.voteProgressBarColor);
    if (typeof pv.showFirstCorrectAnswerer === "boolean") {
      setShowFirstCorrectAnswerer(pv.showFirstCorrectAnswerer);
    }
    if (typeof pv.firstCorrectWinnersCount === "number") {
      setFirstCorrectWinnersCount(Math.max(1, Math.min(20, Math.trunc(pv.firstCorrectWinnersCount))));
    }
  }, [room?.id, room?.publicView]);

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
      showVoteCount: question.showVoteCount ?? true,
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
  ]);

  useEffect(() => {
    document.title = "Админ";
  }, []);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl).then(setQrData).catch(() => setQrData(""));
  }, [joinUrl]);

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
      if (!q || q.type === "tag_cloud") return prev;
      if (q.subQuizId == null) return prev;
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
    if (/сохранен|сохранена|добавлен|обнулен|завершен|удалён|удален/i.test(message)) return "success";
    if (/сначала|не найден|пустой|неверн|ошибк/i.test(message.toLowerCase())) return "warning";
    return "info";
  }, [message]);

  const currentPublicScreenText = useMemo(() => {
    if (publicViewMode === "leaderboard") {
      return "таблица лидеров";
    }
    if (publicViewMode === "question") {
      return "вопрос";
    }
    return "название";
  }, [publicViewMode]);

  function cloneQuestionForms(forms: QuestionForm[]): QuestionForm[] {
    return JSON.parse(JSON.stringify(forms)) as QuestionForm[];
  }

  function addSubQuizSheet() {
    const id = `new-${crypto.randomUUID()}`;
    setSubQuizSheets((prev) => {
      const next = [...prev, { id, title: "Новый квиз" }];
      syncedSubQuizIdsKeyRef.current = next.map((s) => s.id).join(",");
      return next;
    });
    setExpandedSubQuizId(id);
    setRoomQuestionsTab("quizzes");
  }

  async function removeSubQuizSheet(sqId: string) {
    if (!window.confirm("Удалить квиз и все вопросы в нём?")) return;
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
    if (persisted) {
      setMessage("Квиз удалён");
      if (nextForms.length === 0) setQuestionId("");
    }
  }

  function addQuestionToSubQuiz(sqId: string | null) {
    setQuestionDialogError("");
    questionDialogSnapshotRef.current = cloneQuestionForms(questionForms);
    const newQ = createEmptyQuestion(sqId);
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
    closeQuestionDialog();
    const persisted = await persistQuestions(next, subQuizSheets);
    if (persisted) {
      setMessage("Вопросы сохранены");
      if (next.length === 0) setQuestionId("");
    }
  }

  function updateQuestion(index: number, patch: Partial<QuestionForm>) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const next = { ...q, ...patch };
        if (patch.type === "tag_cloud") {
          next.editorQuizMode = false;
        } else if (patch.type === "single" || patch.type === "multi") {
          if (q.type === "tag_cloud") {
            next.editorQuizMode = true;
            if (next.options.length > 0 && !next.options.some((o) => o.isCorrect)) {
              next.options = next.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
            }
          }
        }
        if (patch.type === "single") {
          let firstCorrect = next.options.findIndex((o) => o.isCorrect);
          if (firstCorrect === -1 && next.options.length > 0) {
            firstCorrect = 0;
          }
          next.options = next.options.map((o, optIdx) => ({ ...o, isCorrect: optIdx === firstCorrect && firstCorrect !== -1 }));
        }
        return next;
      }),
    );
  }

  /** Для голосований комнаты: выкл. — только опрос; вкл. — правильные ответы и баллы. */
  function toggleNoCorrectMode(questionIndex: number, voteOnlyWithoutCorrect: boolean) {
    if (voteOnlyWithoutCorrect) {
      setQuestionForms((prev) =>
        prev.map((q, i) => (i === questionIndex
          ? { ...q, editorQuizMode: false, options: q.options.map((o) => ({ ...o, isCorrect: false })) }
          : q)),
      );
      return;
    }
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        if (q.type === "tag_cloud") return q;
        return {
          ...q,
          editorQuizMode: true,
          options: q.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 })),
        };
      }),
    );
  }

  function addOption(questionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, { text: "", isCorrect: false }] } : q)),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestionForms((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        if (q.options.length <= 2) return q;
        return { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) };
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

  function finishQuiz() {
    if (!quizId) return;
    socket.emit("quiz:finish", { quizId });
    setMessage("Квиз завершен");
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
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll("\"", "\"\"")}"`;
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

  function setPublicResultsView(mode: "title" | "question" | "leaderboard", questionIdForMode?: string) {
    if (!quizId) {
      setMessage("Quiz ID не найден");
      return;
    }
    const nextQuestionId = mode === "question" ? questionIdForMode : undefined;
    if (mode === "question" && !nextQuestionId) {
      setMessage("Не выбран вопрос для экрана");
      return;
    }
    setShowFirstCorrectAnswerer(false);
    setPublicViewMode(mode);
    setPublicViewQuestionId(nextQuestionId);
    emitPublicViewSet({
      mode,
      questionId: nextQuestionId,
      showFirstCorrectAnswerer: false,
    });
  }

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
      emitPublicViewSet({
        mode: "title",
        highlightedLeadersCount: 3,
        showFirstCorrectAnswerer: false,
        firstCorrectWinnersCount: 1,
      });
      setMessage("Настройки отображения результатов сброшены");
      return;
    }
    setPublicViewMode("title");
    setPublicViewQuestionId(undefined);
  }

  function updateShowFirstCorrectAnswerer(next: boolean, questionIdForProjector?: string) {
    setShowFirstCorrectAnswerer(next);
    if (next && questionIdForProjector) {
      setPublicViewMode("question");
      setPublicViewQuestionId(questionIdForProjector);
    }
    if (!quizId) return;
    if (next && questionIdForProjector) {
      emitPublicViewSet({
        mode: "question",
        questionId: questionIdForProjector,
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

  function updateQuestionShowVoteCount(questionIndex: number, next: boolean) {
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showVoteCount: next } : q)),
    );
    const question = questionForms[questionIndex];
    if (!quizId || publicViewMode !== "question" || !question?.id || publicViewQuestionId !== question.id) return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: next,
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
    if (!quizId || publicViewMode !== "question" || !question?.id || publicViewQuestionId !== question.id) return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? true,
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
    const ok = await patchQuestionProjectorSettings(prev.id, { projectorShowFirstCorrect: next }, subQuizSheets, nextForms);
    if (!ok) {
      setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, projectorShowFirstCorrect: previousSwitch } : q,
        ),
      );
    }
  }

  function patchQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, next: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(next) ? next : 1)));
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q)),
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
    if (!quizId || publicViewMode !== "question" || !question?.id || publicViewQuestionId !== question.id) return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? true,
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
      prev.map((q, idx) => (idx === questionIndex
        ? { ...q, injectedTagWords: nextWords, injectedTagsInput: "" }
        : q)),
    );
    if (!quizId || publicViewMode !== "question" || !question?.id || publicViewQuestionId !== question.id) return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? true,
      showQuestionTitle: question.showQuestionTitle ?? true,
      hiddenTagTexts: question.hiddenTagTexts ?? [],
      injectedTagWords: nextWords,
      tagCountOverrides: question.tagCountOverrides ?? [],
    });
    setMessage("Список ответов добавлен");
  }

  function updateTagCountOverride(questionIndex: number, tagText: string, nextCount: number) {
    const question = questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(question.tagCountOverrides ?? [], tagText, nextCount);
    setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q)),
    );
    if (!quizId || publicViewMode !== "question" || !question?.id || publicViewQuestionId !== question.id) return;
    emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? true,
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
    setSelectedQuestionIndex(index);
    setIsQuestionDialogOpen(true);
  }

  function closeQuestionDialog() {
    setIsQuestionDialogOpen(false);
  }

  function cancelQuestionDialog() {
    setQuestionDialogError("");
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
    const ok = await persistQuestions(questionForms, subQuizSheets, {
      suppressToast: true,
      validateOnlyIndex: idx,
    });
    if (!ok) {
      setQuestionDialogError("Не удалось сохранить вопросы. Проверьте соединение и попробуйте ещё раз.");
      return;
    }
    setQuestionDialogError("");
    setMessage("Вопросы сохранены");
    closeQuestionDialog();
  }

  function commitNewOption() {
    const value = newOptionText.trim();
    if (!value) return;
    setQuestionForms((prev) =>
      prev.map((question, index) =>
        index === selectedQuestionIndex
          ? { ...question, options: [...question.options, { text: value, isCorrect: false }] }
          : question,
      ),
    );
    setNewOptionText("");
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
      {!isAuth && <AdminLoginForm onSuccess={() => checkSession().then(() => { loadRoom(); setupSocketListeners(); })} />}
      {isAuth && room && (
        <Stack direction="row" spacing={2} alignItems="stretch">
          <Card
            variant="outlined"
            component="nav"
            aria-label="Разделы админки"
            sx={{
              width: { xs: 72, md: 256 },
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          >
            <CardContent sx={{ px: { xs: 0.5, md: 2 }, py: { xs: 1, md: 2 }, "&:last-child": { pb: { xs: 1, md: 2 } } }}>
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
                        px: { xs: 1, md: 1.5 },
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
                        primaryTypographyProps={{ variant: "body2", fontWeight: activeSection === id ? 600 : 400 }}
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

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack spacing={3}>
              {activeSection === "general" && (
                <AdminGeneralSection
                  editableTitle={editableTitle}
                  setEditableTitle={setEditableTitle}
                  saveQuizTitle={saveQuizTitle}
                  joinUrl={joinUrl}
                  qrData={qrData}
                  quizId={quizId}
                  setQuizId={setQuizId}
                  questionId={questionId}
                  setQuestionId={setQuestionId}
                  finishQuiz={finishQuiz}
                />
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
                    }}
                  >
                    <Tabs
                      value={roomQuestionsTab}
                      onChange={(_, v: "quizzes" | "votes") => setRoomQuestionsTab(v)}
                      sx={{ borderBottom: 1, borderColor: "divider", px: 0.5 }}
                    >
                      <Tab label="Квизы" value="quizzes" />
                      <Tab label="Голосования" value="votes" />
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
                            <Box sx={{ alignSelf: "flex-start", flexShrink: 0, pb: 3, width: "100%" }}>
                              <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                size="small"
                                onClick={addSubQuizSheet}
                              >
                                Создать квиз
                              </Button>
                            </Box>
                            <Stack spacing={3} sx={{ width: "100%", mt: 1.5 }}>
                            {subQuizSheets.map((sq) => {
                            const quizIndexMap = buildQuestionIndexMapForSubQuiz(questionForms, sq.id);
                            const qSel = quizIndexMap.indexOf(selectedQuestionIndex);
                            const quizHasQuestions = quizIndexMap.length > 0;
                            return (
                              <Accordion
                                key={sq.id}
                                disableGutters
                                expanded={expandedSubQuizId === sq.id}
                                onChange={(_, expanded) => setExpandedSubQuizId(expanded ? sq.id : false)}
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
                                          prev.map((s) => (s.id === sq.id ? { ...s, title } : s)),
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
                                          void removeSubQuizSheet(sq.id);
                                        }}
                                      >
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0, px: 0, pb: 2 }}>
                                  {quizHasQuestions ? (
                                      <AdminQuestionsSection
                                        listTitle="Вопросы квиза"
                                        listHeaderPrimaryAction={{
                                          label: "Результаты",
                                          to: `/admin/${eventName}/sub-quizzes/${sq.id}/results`,
                                        }}
                                        addButtonLabel="Вопрос"
                                        questionForms={quizIndexMap.map((i) => questionForms[i])}
                                        selectedListIndex={qSel < 0 ? 0 : qSel}
                                        remapQuestionIndex={(local) => quizIndexMap[local] ?? 0}
                                        eventName={eventName}
                                        expandedQuestionSettingsIndex={expandedQuestionSettingsIndex}
                                        setExpandedQuestionSettingsIndex={setExpandedQuestionSettingsIndex}
                                        questionResults={questionResults}
                                        publicViewMode={publicViewMode}
                                        publicViewQuestionId={publicViewQuestionId}
                                        setMessage={setMessage}
                                        openQuestionDialog={openQuestionDialog}
                                        addQuestion={() => addQuestionToSubQuiz(sq.id)}
                                        setPublicResultsView={setPublicResultsView}
                                        updateQuestionShowVoteCount={updateQuestionShowVoteCount}
                                        updateQuestionShowTitle={updateQuestionShowTitle}
                                        openTagInputDialog={openTagInputDialog}
                                        openTagResultsDialog={openTagResultsDialog}
                                        confirmResetQuestionAnswersByIndex={confirmResetQuestionAnswersByIndex}
                                        toggleQuestion={toggleQuestion}
                                        updateQuestionProjectorShowFirstCorrect={updateQuestionProjectorShowFirstCorrect}
                                        patchQuestionProjectorFirstCorrectWinnersCount={
                                          patchQuestionProjectorFirstCorrectWinnersCount
                                        }
                                        commitQuestionProjectorFirstCorrectWinnersCount={
                                          commitQuestionProjectorFirstCorrectWinnersCount
                                        }
                                        showFirstCorrectAnswerer={showFirstCorrectAnswerer}
                                        updateShowFirstCorrectAnswerer={updateShowFirstCorrectAnswerer}
                                      />
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
                            <Button
                              startIcon={<AddIcon />}
                              variant="outlined"
                              size="small"
                              onClick={() => addQuestionToSubQuiz(null)}
                            >
                              Добавить голосование
                            </Button>
                            <AdminQuestionsSection
                              listTitle="Голосования комнаты"
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
                              updateQuestionShowTitle={updateQuestionShowTitle}
                              openTagInputDialog={openTagInputDialog}
                              openTagResultsDialog={openTagResultsDialog}
                              confirmResetQuestionAnswersByIndex={confirmResetQuestionAnswersByIndex}
                              toggleQuestion={toggleQuestion}
                              updateQuestionProjectorShowFirstCorrect={updateQuestionProjectorShowFirstCorrect}
                              patchQuestionProjectorFirstCorrectWinnersCount={
                                patchQuestionProjectorFirstCorrectWinnersCount
                              }
                              commitQuestionProjectorFirstCorrectWinnersCount={
                                commitQuestionProjectorFirstCorrectWinnersCount
                              }
                              showFirstCorrectAnswerer={showFirstCorrectAnswerer}
                              updateShowFirstCorrectAnswerer={updateShowFirstCorrectAnswerer}
                            />
                          </Stack>
                        ))}
                    </Box>
                  </Paper>
                </Stack>
              )}

              {activeSection === "branding" && (
                <AdminBrandingSection
                  projectorBackground={projectorBackground}
                  setProjectorBackground={setProjectorBackground}
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
                  emitBrandingPatch={emitBrandingPatch}
                />
              )}

              {activeSection === "results" && (
                <AdminResultsSection
                  leaderboardSort={leaderboardSort}
                  setLeaderboardSort={setLeaderboardSort}
                  displayedLeaderboard={displayedLeaderboard}
                  exportLeaderboardCsv={exportLeaderboardCsv}
                  publicViewMode={publicViewMode}
                  setPublicResultsView={setPublicResultsView}
                  highlightedLeadersCount={highlightedLeadersCount}
                  setHighlightedLeadersCount={setHighlightedLeadersCount}
                  updateHighlightedLeaders={updateHighlightedLeaders}
                  resetResultsUiSettings={resetResultsUiSettings}
                  showFirstCorrectAnswerer={showFirstCorrectAnswerer}
                  onShowFirstCorrectAnswererChange={updateShowFirstCorrectAnswerer}
                  firstCorrectWinnersCount={firstCorrectWinnersCount}
                  setFirstCorrectWinnersCount={setFirstCorrectWinnersCount}
                  updateFirstCorrectWinnersCount={updateFirstCorrectWinnersCount}
                  subQuizLeaderboardOptions={leaderboardsBySubQuiz.map((x) => ({
                    subQuizId: x.subQuizId,
                    title: x.title,
                  }))}
                  selectedResultsSubQuizId={resultsSubQuizId}
                  onSelectResultsSubQuiz={setResultsSubQuizId}
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
      <Snackbar
        open
        onClose={() => {}}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.snackbar + 100,
        }}
      >
        <Alert
          severity="info"
          sx={{ width: "100%", borderRadius: 0 }}
        >
          {currentPublicScreenText}
        </Alert>
      </Snackbar>

      <Dialog
        open={isQuestionDialogOpen}
        onClose={() => cancelQuestionDialog()}
        maxWidth="md"
        fullWidth
        aria-label="Редактор вопроса"
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 1, px: 1 }}>
          <IconButton onClick={cancelQuestionDialog} size="small" aria-label="Закрыть без сохранения">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {questionForms[selectedQuestionIndex] && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              {!!questionDialogError && (
                <Alert severity="error" onClose={() => setQuestionDialogError("")}>
                  {questionDialogError}
                </Alert>
              )}
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

              {questionForms[selectedQuestionIndex].type !== "tag_cloud" && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    Варианты ответов
                  </Typography>
                  <Stack spacing={2}>
                    {questionForms[selectedQuestionIndex].options.map((option, oIndex) => (
                      <Stack
                        key={`q-${selectedQuestionIndex}-o-${oIndex}`}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                        sx={{ width: "100%", minWidth: 0 }}
                      >
                        <TextField
                          label={`Вариант ${oIndex + 1}`}
                          value={option.text}
                          onChange={(e) => updateOption(selectedQuestionIndex, oIndex, { text: e.target.value })}
                          size="small"
                          multiline
                          minRows={1}
                          maxRows={8}
                          sx={{ flex: 1, minWidth: 0 }}
                        />
                        {isEditorQuizMode(questionForms[selectedQuestionIndex]) && (
                          <Stack direction="row" spacing={0} sx={{ flexShrink: 0, pt: 0.5 }} aria-label="Правильность ответа">
                            <Tooltip title="Правильный">
                              <IconButton
                                size="small"
                                color={option.isCorrect ? "success" : "default"}
                                onClick={() => {
                                  updateOption(selectedQuestionIndex, oIndex, { isCorrect: true });
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
                                  updateOption(selectedQuestionIndex, oIndex, { isCorrect: false });
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
                          disabled={questionForms[selectedQuestionIndex].options.length <= 2}
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
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField
                  select
                  label="Тип ответа"
                  value={questionForms[selectedQuestionIndex].type}
                  onChange={(e) =>
                    updateQuestion(selectedQuestionIndex, { type: e.target.value as QuestionType })
                  }
                  size="small"
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="single">Один правильный</MenuItem>
                  <MenuItem value="multi">Несколько правильных</MenuItem>
                  <MenuItem value="tag_cloud">Облако тегов</MenuItem>
                </TextField>
                {questionForms[selectedQuestionIndex].type === "tag_cloud" ? (
                  <TextField
                    type="number"
                    label="Макс. ответов"
                    value={questionForms[selectedQuestionIndex].maxAnswers}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex, { maxAnswers: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })
                    }
                    size="small"
                    sx={{ minWidth: 140 }}
                    helperText="От 1 до 5"
                  />
                ) : (
                  isEditorQuizMode(questionForms[selectedQuestionIndex]) &&
                  questionForms[selectedQuestionIndex].subQuizId != null && (
                    <TextField
                      type="number"
                      label="Баллы"
                      value={questionForms[selectedQuestionIndex].points}
                      onChange={(e) =>
                        updateQuestion(selectedQuestionIndex, { points: Number(e.target.value) || 1 })
                      }
                      size="small"
                      sx={{ minWidth: 120 }}
                    />
                  )
                )}
              </Stack>
              {questionForms[selectedQuestionIndex].type !== "tag_cloud" &&
                questionForms[selectedQuestionIndex].subQuizId == null && (
                <FormControlLabel
                  control={(
                    <Switch
                      checked={questionForms[selectedQuestionIndex].editorQuizMode}
                      onChange={(_event, checked) => toggleNoCorrectMode(selectedQuestionIndex, !checked)}
                    />
                  )}
                  label="Правильные ответы"
                />
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
            onClick={() => removeQuestion(selectedQuestionIndex)}
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
              value={tagInputDialogQuestionIndex !== null ? (questionForms[tagInputDialogQuestionIndex]?.injectedTagsInput ?? "") : ""}
              onChange={(e) => {
                if (tagInputDialogQuestionIndex === null) return;
                const value = e.target.value;
                setQuestionForms((prev) => prev.map((q, idx) => (
                  idx === tagInputDialogQuestionIndex ? { ...q, injectedTagsInput: value } : q
                )));
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
                      onClick={() => updateTagCountOverride(tagResultsDialogQuestionIndex, tag.text, tag.count - 1)}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={tag.count}
                      onChange={(e) => updateTagCountOverride(tagResultsDialogQuestionIndex, tag.text, Number(e.target.value))}
                      inputProps={{ min: 0, step: 1 }}
                      sx={{ width: 92 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => updateTagCountOverride(tagResultsDialogQuestionIndex, tag.text, tag.count + 1)}
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
    </Container>
  );
}
