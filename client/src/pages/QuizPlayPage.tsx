import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SPEAKER_TILE_ID } from "@meyouquize/shared";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { API_BASE } from "../config";
import { SpeakerQuestionsDialog } from "../components/quiz/SpeakerQuestionsDialog";
import { PlayerVoteResultsDialog } from "../components/quiz/PlayerVoteResultsDialog";
import { useQuizPlayCompletion } from "../hooks/useQuizPlayCompletion";
import { useQuizPlayScrollLock } from "../hooks/useQuizPlayScrollLock";
import { useQuizPlaySocket } from "../hooks/useQuizPlaySocket";
import { useBrandFont } from "../hooks/useBrandFont";
import { useEventFavicon } from "../hooks/useEventFavicon";
import { socket } from "../socket";
import { getNickname, getOrCreateDeviceId, randomNickname, setNickname } from "../storage";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";
import { buildBrandBackground } from "../features/branding/brandVisual";
import { buildPlayerTilesOrder, getVisiblePlayerBanners } from "../features/quizPlay/tiles";
import {
  buildQuizPlayContainerSx,
  CompletionOverlay,
  EventTitleBlock,
  JoinCard,
  PlayerIdentityBar,
  PlayerTilesGrid,
  QuestionPopupCard,
  ReactionsDock,
  RestoreJoinPendingBlock,
} from "./quiz-play/QuizPlayBrandingBlocks";
import type { QuizState, ReactionType } from "./quiz-play/types";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
const REACTION_WINDOW_MS = 1000;
const REACTION_MAX_PER_WINDOW = 10;

function getRoomJoinKey(slug: string) {
  return `mq_joined_${slug}`;
}

function getRoomNickKey(slug: string) {
  return `mq_nickname_${slug}`;
}

function wasRoomJoined(slug: string): boolean {
  return localStorage.getItem(getRoomJoinKey(slug)) === "1";
}

function ruBallLabel(n: number): string {
  const v = Math.abs(Math.trunc(n));
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} баллов`;
  const mod10 = v % 10;
  if (mod10 === 1) return `${n} балл`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} балла`;
  return `${n} баллов`;
}

function buildConnectionChip(status: "online" | "reconnecting" | "offline") {
  if (status === "online") {
    return { label: "Онлайн", color: "success" as const, variant: "filled" as const };
  }
  if (status === "reconnecting") {
    return { label: "Переподключение", color: "warning" as const, variant: "outlined" as const };
  }
  return { label: "Нет соединения", color: "error" as const, variant: "outlined" as const };
}

function emitJoinWithLog(slug: string, reason: "manual" | "restore", nick: string) {
  const payload = {
    slug,
    nickname: nick,
    deviceId: getOrCreateDeviceId(),
  };
  console.info("[quiz-play] join attempt", {
    reason,
    connected: socket.connected,
    socketId: socket.id,
    payload,
  });
  if (socket.connected) {
    socket.emit("quiz:join", payload);
    return;
  }
  socket.connect();
  socket.once("connect", () => {
    console.info("[quiz-play] socket connected, retry join", { socketId: socket.id, reason });
    socket.emit("quiz:join", payload);
  });
}

export function QuizPlayPage() {
  const { slug = "" } = useParams();
  const [quizTitle, setQuizTitle] = useState("");
  const [nickname, setNick] = useState(() => {
    const roomNickname = slug ? localStorage.getItem(getRoomNickKey(slug)) : "";
    return roomNickname || getNickname() || "";
  });
  const [joined, setJoined] = useState(false);
  const [restoreJoinPending, setRestoreJoinPending] = useState(() => {
    if (typeof window === "undefined" || !slug) return false;
    const wasJoined = wasRoomJoined(slug);
    const roomNickname = localStorage.getItem(getRoomNickKey(slug)) || "";
    const persistedNick = roomNickname || getNickname() || "";
    return wasJoined && persistedNick.trim().length > 0;
  });
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [tagAnswers, setTagAnswers] = useState<string[]>([""]);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string[]>>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<string[]>([]);
  const [playerAnswersHydrated, setPlayerAnswersHydrated] = useState(false);
  const [acceptedQuestionId, setAcceptedQuestionId] = useState<string | null>(null);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [metaBrandPlayerBackgroundImageUrl, setMetaBrandPlayerBackgroundImageUrl] = useState("");
  const [metaBrandBodyBackgroundColor, setMetaBrandBodyBackgroundColor] = useState("#000000");
  const [connectionStatus, setConnectionStatus] = useState<"online" | "reconnecting" | "offline">(
    "reconnecting",
  );
  const [speakerQuestions, setSpeakerQuestions] = useState<SpeakerQuestionsPayload | null>(null);
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [speakerName, setSpeakerName] = useState("Все спикеры");
  const [speakerQuestionText, setSpeakerQuestionText] = useState("");
  const [resultsDialogQuestionId, setResultsDialogQuestionId] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const activeQuestionIdRef = useRef<string | null>(null);
  const activeQuestionTypeRef = useRef<"single" | "multi" | "tag_cloud" | "ranking" | null>(null);
  const selectedRef = useRef<string[]>([]);
  const rankOrderRef = useRef<string[]>([]);
  const tagAnswersRef = useRef<string[]>([""]);
  const rankRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRankRowTopsRef = useRef<Map<string, number>>(new Map());
  const reactionTimestampsRef = useRef<number[]>([]);
  const pendingSubmitPayloadRef = useRef<{
    quizId: string;
    questionId: string;
    optionIds?: string[];
    rankedOptionIds?: string[];
    tagAnswers?: string[];
  } | null>(null);
  /** Последний известный активный вопрос сабквиза (чтобы при снятии вопроса с экрана понять, что это был последний). */
  const lastSubQuizProgressRef = useRef<{
    questionId: string;
    index: number;
    total: number;
  } | null>(null);

  const {
    subQuizCompleteOpen,
    finalCompletionDismissed,
    setFinalCompletionDismissed,
    showSubQuizCompleteCard,
    showFinishedCompletionCard,
    showIdleWaiting,
    hasActiveQuestion,
  } = useQuizPlayCompletion({
    slug,
    joined,
    quiz,
    submittedQuestionIds,
    lastSubQuizProgressRef,
  });
  const handleQuestionSubmitted = useCallback((questionId: string) => {
    setAcceptedQuestionId(questionId);
    if (pendingSubmitPayloadRef.current?.questionId === questionId) {
      pendingSubmitPayloadRef.current = null;
    }
  }, []);
  const handleParticipantMissing = useCallback(() => {
    if (!slug) return;
    const safeNick = (nickname || "").trim() || "Игрок";
    emitJoinWithLog(slug, "restore", safeNick);
  }, [nickname, slug]);
  const handleQuizJoined = useCallback(() => {
    const payload = pendingSubmitPayloadRef.current;
    if (!payload) return;
    socket.emit("answer:submit", payload);
  }, []);

  const nonQuizActiveQuestion = useMemo(() => {
    if (!quiz) return null;
    const activeList = Array.isArray(quiz.activeQuestions)
      ? quiz.activeQuestions
      : quiz.activeQuestion
        ? [quiz.activeQuestion]
        : [];
    if (acceptedQuestionId) {
      const accepted = activeList.find((q) => q.id === acceptedQuestionId);
      if (accepted) return accepted;
    }
    // Для голосований комнаты и авто-режима квиза показываем первый активный неотвеченный вопрос.
    const autoFlow =
      quiz.quizProgress?.questionFlowMode === "auto" ||
      (Array.isArray(quiz.activeQuestions) && quiz.activeQuestions.length > 1);
    if (!quiz.quizProgress || autoFlow) {
      return activeList.find((q) => !submittedQuestionIds.includes(q.id)) ?? null;
    }
    return quiz.activeQuestion;
  }, [quiz, submittedQuestionIds, acceptedQuestionId]);

  useEffect(() => {
    activeQuestionIdRef.current = nonQuizActiveQuestion?.id ?? null;
    activeQuestionTypeRef.current = nonQuizActiveQuestion?.type ?? null;
  }, [nonQuizActiveQuestion]);

  useEffect(() => {
    if (!nonQuizActiveQuestion) {
      setSelected([]);
      setRankOrder([]);
      setTagAnswers([""]);
      return;
    }
    setSelected([]);
    setTagAnswers([""]);
    if (nonQuizActiveQuestion.type === "ranking") {
      setRankOrder(nonQuizActiveQuestion.options.map((o) => o.id));
      return;
    }
    setRankOrder([]);
  }, [nonQuizActiveQuestion?.id]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    rankOrderRef.current = rankOrder;
  }, [rankOrder]);

  useEffect(() => {
    tagAnswersRef.current = tagAnswers;
  }, [tagAnswers]);

  useEffect(() => {
    const q = nonQuizActiveQuestion;
    if (!q || q.type !== "ranking") {
      setRankOrder([]);
      return;
    }
    setRankOrder(q.options.map((o) => o.id));
  }, [nonQuizActiveQuestion]);

  useEffect(() => {
    if (!slug) return;
    const roomNickname = localStorage.getItem(getRoomNickKey(slug));
    if (roomNickname) setNick(roomNickname);
  }, [slug]);

  useEffect(() => {
    if (!joined) {
      setPlayerAnswersHydrated(false);
    }
  }, [joined, slug]);

  useQuizPlayScrollLock({
    joined,
    quiz,
    subQuizCompleteOpen,
    finalCompletionDismissed,
    lastSubQuizProgressRef,
  });

  useQuizPlaySocket({
    activeQuestionIdRef,
    activeQuestionTypeRef,
    selectedRef,
    rankOrderRef,
    tagAnswersRef,
    setQuiz,
    setSelected,
    setRankOrder,
    setTagAnswers,
    setSubmittedAnswers,
    setSubmittedQuestionIds,
    setPlayerAnswersHydrated,
    onQuestionSubmitted: handleQuestionSubmitted,
    setError,
    setJoined,
    setConnectionStatus,
    setSpeakerQuestions,
    onParticipantMissing: handleParticipantMissing,
    onQuizJoined: handleQuizJoined,
  });

  useEffect(() => {
    if (!slug || !joined) return;
    socket.emit("speaker:questions:subscribe", { slug, viewer: "player" });
  }, [slug, joined]);

  useEffect(() => {
    if (!slug) return;
    const reconnectAndRejoinIfNeeded = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!socket.connected) socket.connect();
      if (joined) {
        const safeNick = (nickname || "").trim() || "Игрок";
        emitJoinWithLog(slug, "restore", safeNick);
      }
    };
    const onVisibilityChange = () => {
      reconnectAndRejoinIfNeeded();
    };
    const onPageShow = () => {
      reconnectAndRejoinIfNeeded();
    };
    const onOnline = () => {
      reconnectAndRejoinIfNeeded();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onOnline);
    };
  }, [joined, nickname, slug]);

  useEffect(() => {
    document.title = quiz?.title?.trim() || "Квиз";
  }, [quiz?.title]);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/quiz/by-slug/${slug}/meta`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          title?: string;
          brandPlayerBackgroundImageUrl?: string;
          brandBodyBackgroundColor?: string;
        };
        if (typeof payload.title === "string") {
          setQuizTitle(payload.title);
        }
        if (typeof payload.brandPlayerBackgroundImageUrl === "string") {
          setMetaBrandPlayerBackgroundImageUrl(payload.brandPlayerBackgroundImageUrl);
        }
        if (
          typeof payload.brandBodyBackgroundColor === "string" &&
          payload.brandBodyBackgroundColor.trim()
        ) {
          setMetaBrandBodyBackgroundColor(payload.brandBodyBackgroundColor);
        }
      } catch {
        // ignore network errors, socket state can still provide title later
      }
    })();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug || !nickname.trim()) return;
    const wasJoined = wasRoomJoined(slug);
    if (!wasJoined) return;
    setRestoreJoinPending(true);
    emitJoinWithLog(slug, "restore", nickname.trim());
  }, [slug, nickname]);

  useEffect(() => {
    if (joined && restoreJoinPending) {
      setRestoreJoinPending(false);
    }
  }, [joined, restoreJoinPending]);

  useEffect(() => {
    if (!restoreJoinPending) return;
    const timer = window.setTimeout(() => setRestoreJoinPending(false), 1200);
    return () => window.clearTimeout(timer);
  }, [restoreJoinPending]);

  useEffect(() => {
    if (!restoreJoinPending) return;
    if (error) setRestoreJoinPending(false);
  }, [restoreJoinPending, error]);

  useEffect(() => {
    // Fail-safe: не блокируем UI ожиданием всех сокет-событий на мобильной сети.
    const readyForJoined = joined;
    const readyForLogin = !joined && !restoreJoinPending;
    if (readyForJoined || readyForLogin) {
      setBootLoading(false);
      return;
    }
    setBootLoading(true);
  }, [joined, restoreJoinPending]);

  useEffect(() => {
    if (!bootLoading) return;
    const timer = window.setTimeout(() => {
      // Аварийный фолбэк: если сокет не восстановился, показываем UI входа вместо чёрного экрана.
      if (!joined) {
        setRestoreJoinPending(false);
        setBootLoading(false);
      }
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [bootLoading, joined]);

  useEffect(() => {
    if (joined || restoreJoinPending) return;
    const timer = window.setTimeout(() => {
      nicknameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [joined, restoreJoinPending]);

  const persistNickname = useCallback(
    (nextRaw: string) => {
      const next = nextRaw.trim();
      setNick(next);
      setNickname(next);
      if (slug) localStorage.setItem(getRoomNickKey(slug), next);
    },
    [slug],
  );

  const canSubmit = useMemo(() => {
    if (!quiz || !nonQuizActiveQuestion) return false;
    const alreadySubmitted = submittedQuestionIds.includes(nonQuizActiveQuestion.id);
    if (nonQuizActiveQuestion.type === "tag_cloud") {
      const filled = tagAnswers.map((value) => value.trim()).filter(Boolean);
      return filled.length > 0 && !nonQuizActiveQuestion.isClosed && !alreadySubmitted;
    }
    if (nonQuizActiveQuestion.type === "ranking") {
      const n = nonQuizActiveQuestion.options.length;
      const setOk = new Set(rankOrder);
      return (
        n > 0 &&
        rankOrder.length === n &&
        rankOrder.every((id) => setOk.has(id)) &&
        setOk.size === n &&
        !nonQuizActiveQuestion.isClosed &&
        !alreadySubmitted
      );
    }
    return selected.length > 0 && !nonQuizActiveQuestion.isClosed && !alreadySubmitted;
  }, [quiz, nonQuizActiveQuestion, selected, rankOrder, submittedQuestionIds, tagAnswers]);

  function join() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Введите имя или используйте случайное");
      nicknameInputRef.current?.focus();
      return;
    }
    emitJoinWithLog(slug, "manual", trimmed);
    localStorage.setItem(getRoomJoinKey(slug), "1");
    persistNickname(trimmed);
    setError("");
  }

  function editNickname() {
    if (!joined || !quiz?.id) return;
    setNicknameDraft(nickname.trim());
    setNicknameDialogOpen(true);
  }

  function submitNicknameUpdate() {
    if (!quiz?.id) return;
    const next = nicknameDraft.trim();
    if (!next) {
      setError("Имя не может быть пустым");
      return;
    }
    if (next === nickname.trim()) {
      setNicknameDialogOpen(false);
      return;
    }
    socket.emit("quiz:nickname:update", {
      quizId: quiz.id,
      nickname: next,
    });
    setNicknameDialogOpen(false);
  }

  function toggleOption(id: string) {
    if (!nonQuizActiveQuestion) return;
    if (nonQuizActiveQuestion.type === "single") {
      setSelected((prev) => (prev.includes(id) ? [] : [id]));
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function moveRankOption(id: string, direction: -1 | 1) {
    setRankOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + direction;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i];
      next[i] = next[j]!;
      next[j] = tmp!;
      return next;
    });
  }

  function submit() {
    if (!quiz || !nonQuizActiveQuestion || !canSubmit) return;
    if (nonQuizActiveQuestion.type === "tag_cloud") {
      const payload = {
        quizId: quiz.id,
        questionId: nonQuizActiveQuestion.id,
        tagAnswers: tagAnswers.map((value) => value.trim()).filter(Boolean),
      };
      pendingSubmitPayloadRef.current = payload;
      socket.emit("answer:submit", payload);
      return;
    }
    if (nonQuizActiveQuestion.type === "ranking") {
      const payload = {
        quizId: quiz.id,
        questionId: nonQuizActiveQuestion.id,
        rankedOptionIds: rankOrder,
      };
      pendingSubmitPayloadRef.current = payload;
      socket.emit("answer:submit", payload);
      return;
    }
    const payload = {
      quizId: quiz.id,
      questionId: nonQuizActiveQuestion.id,
      optionIds: selected,
    };
    pendingSubmitPayloadRef.current = payload;
    socket.emit("answer:submit", payload);
  }

  function submitSpeakerQuestion() {
    if (!quiz?.id || !speakerQuestionText.trim()) return;
    socket.emit("speaker:question:create", {
      quizId: quiz.id,
      speakerName: speakerName.trim() || "Все спикеры",
      text: speakerQuestionText.trim(),
    });
    setSpeakerQuestionText("");
  }

  function reactSpeakerQuestion(questionId: string, reaction: string) {
    if (!quiz?.id) return;
    socket.emit("speaker:question:react", {
      quizId: quiz.id,
      speakerQuestionId: questionId,
      reaction,
    });
  }

  function toggleReaction(reactionType: ReactionType) {
    if (!quiz?.id) return;
    const now = Date.now();
    const freshTimestamps = reactionTimestampsRef.current.filter(
      (ts) => now - ts <= REACTION_WINDOW_MS,
    );
    if (freshTimestamps.length >= REACTION_MAX_PER_WINDOW) return;
    freshTimestamps.push(now);
    reactionTimestampsRef.current = freshTimestamps;
    socket.emit("reaction:toggle", { quizId: quiz.id, reactionType });
  }

  useEffect(() => {
    const onNicknameUpdated = (payload: { nickname: string }) => {
      persistNickname(payload.nickname);
      setError("");
      setNicknameDialogOpen(false);
    };
    socket.on("quiz:nickname:updated", onNicknameUpdated);
    return () => {
      socket.off("quiz:nickname:updated", onNicknameUpdated);
    };
  }, [persistNickname]);

  const answeredCurrentQuestion =
    !!nonQuizActiveQuestion?.id && submittedQuestionIds.includes(nonQuizActiveQuestion.id);
  const isShowingAcceptedInPopup =
    !!nonQuizActiveQuestion?.id && acceptedQuestionId === nonQuizActiveQuestion.id;
  const shouldHideAnsweredPopup = answeredCurrentQuestion && !isShowingAcceptedInPopup;
  const shouldHideAnsweredUntilHydrated = !playerAnswersHydrated;
  const shouldHideDismissedPopup =
    !!nonQuizActiveQuestion?.id && dismissedQuestionId === nonQuizActiveQuestion.id;
  const displayedSelected =
    nonQuizActiveQuestion?.id && submittedAnswers[nonQuizActiveQuestion.id]
      ? submittedAnswers[nonQuizActiveQuestion.id]
      : nonQuizActiveQuestion?.type === "ranking"
        ? rankOrder
        : selected;
  const displayedQuizProgress = useMemo(() => {
    if (!quiz?.quizProgress || !nonQuizActiveQuestion?.id) return quiz?.quizProgress ?? null;
    const isAuto =
      quiz.quizProgress.questionFlowMode === "auto" ||
      (Array.isArray(quiz.activeQuestions) && quiz.activeQuestions.length > 1);
    if (!isAuto) return quiz.quizProgress;
    const activeList = Array.isArray(quiz.activeQuestions) ? quiz.activeQuestions : [];
    const idx = activeList.findIndex((q) => q.id === nonQuizActiveQuestion.id);
    if (idx < 0) return quiz.quizProgress;
    return {
      ...quiz.quizProgress,
      index: idx + 1,
      total: Math.max(quiz.quizProgress.total, activeList.length),
    };
  }, [quiz?.quizProgress, quiz?.activeQuestions, nonQuizActiveQuestion?.id]);
  const titleText = quiz?.title?.trim() || quizTitle.trim();
  const shouldShowEventTitle = quiz?.showEventTitleOnPlayer ?? true;
  const visiblePlayerBanners = useMemo(
    () => getVisiblePlayerBanners(quiz?.playerBanners),
    [quiz?.playerBanners],
  );
  const visibleBannerById = useMemo(
    () => new Map(visiblePlayerBanners.map((x) => [x.id, x])),
    [visiblePlayerBanners],
  );
  const speakerTileText = quiz?.speakerTileText?.trim() || "Вопросы спикерам";
  const speakerTileBackgroundColor = quiz?.speakerTileBackgroundColor?.trim() || "#1976d2";
  const speakerTileTextColor = quiz?.speakerTileTextColor?.trim() || "#ffffff";
  const speakerTileVisible = quiz?.speakerTileVisible ?? true;
  const programTileText = quiz?.programTileText?.trim() || "Программа";
  const programTileBackgroundColor = quiz?.programTileBackgroundColor?.trim() || "#6a1b9a";
  const programTileTextColor = quiz?.programTileTextColor?.trim() || "#ffffff";
  const programTileLinkUrl = quiz?.programTileLinkUrl?.trim() || "";
  const programTileVisible = quiz?.programTileVisible ?? false;
  const brandPrimaryColor = quiz?.brandPrimaryColor?.trim() || "#7c5acb";
  const playerVoteOptionTextColor = quiz?.playerVoteOptionTextColor?.trim() || "#ffffff";
  const playerVoteProgressBarColor = quiz?.playerVoteProgressBarColor?.trim() || "#fdd32a";
  const brandFontFamily = quiz?.brandFontFamily?.trim() || "Jost, Arial, sans-serif";
  const brandLogoUrl = resolveClientAssetUrl(quiz?.brandLogoUrl?.trim() ?? "");
  const brandPlayerBackgroundImageUrl = resolveClientAssetUrl(
    quiz?.brandPlayerBackgroundImageUrl?.trim() || metaBrandPlayerBackgroundImageUrl.trim(),
  );
  const brandBodyBackgroundColor =
    quiz?.brandBodyBackgroundColor?.trim() || metaBrandBodyBackgroundColor;
  const brandBackground = buildBrandBackground({
    backgroundImageUrl: brandPlayerBackgroundImageUrl,
  });
  useBrandFont(brandFontFamily, quiz?.brandFontUrl);
  useEventFavicon(brandLogoUrl);
  const tileOrder = useMemo(
    () => buildPlayerTilesOrder(quiz?.playerTilesOrder, visiblePlayerBanners),
    [quiz?.playerTilesOrder, visiblePlayerBanners],
  );
  const connectionChip = buildConnectionChip(connectionStatus);
  const reactionMeta = useMemo(() => {
    const source = quiz?.reactionSession?.reactions;
    const fallback = ["👍", "👏", "🔥", "🤔"];
    const reactions = Array.isArray(source) && source.length > 0 ? source : fallback;
    return reactions.map((reaction) => ({
      type: reaction as ReactionType,
      emoji: reaction,
      label: reaction,
    }));
  }, [quiz?.reactionSession?.reactions]);
  const hasPlayerTiles =
    (Boolean(speakerQuestions?.settings.enabled) && speakerTileVisible) ||
    visiblePlayerBanners.length > 0 ||
    (programTileVisible && programTileLinkUrl.length > 0);
  const visibleResultTiles = useMemo(
    () => quiz?.playerVisibleResults ?? [],
    [quiz?.playerVisibleResults],
  );
  const selectedResultTile = useMemo(
    () => visibleResultTiles.find((item) => item.questionId === resultsDialogQuestionId) ?? null,
    [resultsDialogQuestionId, visibleResultTiles],
  );
  useEffect(() => {
    const prevBgColor = document.body.style.backgroundColor;
    const prevBgImage = document.body.style.backgroundImage;
    const prevBgAttachment = document.body.style.backgroundAttachment;
    const prevOverflowX = document.body.style.overflowX;
    const hadPlayerBrandClass = document.body.classList.contains("mq-player-brand-bg");
    const root = document.getElementById("root");
    const prevRootBg = root?.style.backgroundColor ?? "";
    document.body.style.backgroundColor = brandBodyBackgroundColor;
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundAttachment = "";
    document.body.style.overflowX = "";
    document.body.classList.add("mq-player-brand-bg");
    if (root) root.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = prevBgColor;
      document.body.style.backgroundImage = prevBgImage;
      document.body.style.backgroundAttachment = prevBgAttachment;
      document.body.style.overflowX = prevOverflowX;
      if (!hadPlayerBrandClass) document.body.classList.remove("mq-player-brand-bg");
      if (root) root.style.backgroundColor = prevRootBg;
    };
  }, [brandBodyBackgroundColor]);

  useEffect(() => {
    if (!acceptedQuestionId) return;
    const timer = window.setTimeout(() => {
      setDismissedQuestionId(acceptedQuestionId);
      setAcceptedQuestionId(null);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [acceptedQuestionId]);

  useEffect(() => {
    if (!showSubQuizCompleteCard && !showFinishedCompletionCard) return;
    const timer = window.setTimeout(() => {
      setFinalCompletionDismissed(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [setFinalCompletionDismissed, showFinishedCompletionCard, showSubQuizCompleteCard]);

  useEffect(() => {
    const activeQuestionId = nonQuizActiveQuestion?.id;
    if (!activeQuestionId) {
      setDismissedQuestionId(null);
      return;
    }
    if (dismissedQuestionId && dismissedQuestionId !== activeQuestionId) {
      setDismissedQuestionId(null);
    }
  }, [nonQuizActiveQuestion?.id, dismissedQuestionId]);

  function closeQuestionPopup() {
    const activeQuestionId = nonQuizActiveQuestion?.id;
    if (!activeQuestionId) return;
    setDismissedQuestionId(activeQuestionId);
    if (acceptedQuestionId === activeQuestionId) {
      setAcceptedQuestionId(null);
    }
  }

  useLayoutEffect(() => {
    if (
      !nonQuizActiveQuestion ||
      nonQuizActiveQuestion.type !== "ranking" ||
      answeredCurrentQuestion
    ) {
      prevRankRowTopsRef.current = new Map();
      return;
    }
    const nextTops = new Map<string, number>();
    rankOrder.forEach((id) => {
      const el = rankRowRefs.current.get(id);
      if (!el) return;
      nextTops.set(id, el.getBoundingClientRect().top);
    });
    const prevTops = prevRankRowTopsRef.current;
    if (prevTops.size > 0) {
      rankOrder.forEach((id) => {
        const el = rankRowRefs.current.get(id);
        const prevTop = prevTops.get(id);
        const nextTop = nextTops.get(id);
        if (!el || prevTop == null || nextTop == null) return;
        const deltaY = prevTop - nextTop;
        if (Math.abs(deltaY) < 0.5) return;
        el.animate([{ transform: `translateY(${deltaY}px)` }, { transform: "translateY(0)" }], {
          duration: 190,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        });
      });
    }
    prevRankRowTopsRef.current = nextTops;
  }, [rankOrder, nonQuizActiveQuestion, answeredCurrentQuestion]);

  return (
    <Container
      maxWidth="md"
      sx={buildQuizPlayContainerSx({ brandBackground, brandFontFamily, hasActiveQuestion })}
    >
      {bootLoading ? (
        <Box
          sx={{
            flex: 1,
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={46} />
        </Box>
      ) : null}
      {!bootLoading ? (
        <>
          {joined ? (
            <PlayerIdentityBar
              nickname={nickname}
              connectionChip={connectionChip}
              onNicknameClick={editNickname}
            />
          ) : null}
          {joined && quiz?.reactionSession?.isActive ? (
            <ReactionsDock
              reactions={reactionMeta}
              onToggleReaction={toggleReaction}
              brandPrimaryColor={brandPrimaryColor}
            />
          ) : null}
          {(!joined || shouldShowEventTitle) && !(restoreJoinPending && !joined) ? (
            <EventTitleBlock
              joined={joined}
              shouldShowEventTitle={shouldShowEventTitle}
              restoreJoinPending={restoreJoinPending}
              hasActiveQuestion={hasActiveQuestion}
              brandLogoUrl={brandLogoUrl}
              titleText={titleText}
            />
          ) : null}
          {joined ? (
            <PlayerTilesGrid
              tileOrder={tileOrder}
              visibleBannerById={visibleBannerById}
              speakerEnabled={Boolean(speakerQuestions?.settings.enabled)}
              speakerTileVisible={speakerTileVisible}
              onSpeakerOpen={() => setSpeakerDialogOpen(true)}
              speakerTileBackgroundColor={speakerTileBackgroundColor}
              speakerTileTextColor={speakerTileTextColor}
              brandPrimaryColor={brandPrimaryColor}
              speakerTileText={speakerTileText}
              programTileText={programTileText}
              programTileBackgroundColor={programTileBackgroundColor}
              programTileTextColor={programTileTextColor}
              programTileLinkUrl={programTileLinkUrl}
              programTileVisible={programTileVisible}
              playerVoteOptionTextColor={playerVoteOptionTextColor}
              playerVoteProgressBarColor={playerVoteProgressBarColor}
              visibleResultTiles={visibleResultTiles}
              onSelectQuestion={setResultsDialogQuestionId}
            />
          ) : null}
          {!joined && !restoreJoinPending && (
            <JoinCard
              nickname={nickname}
              nicknameInputRef={nicknameInputRef}
              onNicknameChange={setNick}
              onRandomNickname={() => setNick(randomNickname())}
              onJoin={join}
            />
          )}
          {!joined && restoreJoinPending && <RestoreJoinPendingBlock />}
          <PlayerVoteResultsDialog
            open={Boolean(selectedResultTile)}
            tile={selectedResultTile}
            playerVoteOptionTextColor={playerVoteOptionTextColor}
            playerVoteProgressBarColor={playerVoteProgressBarColor}
            submittedAnswersByQuestionId={submittedAnswers}
            onClose={() => setResultsDialogQuestionId(null)}
          />
          {joined &&
            nonQuizActiveQuestion &&
            !showSubQuizCompleteCard &&
            !shouldHideAnsweredPopup &&
            !shouldHideAnsweredUntilHydrated &&
            !shouldHideDismissedPopup && (
              <QuestionPopupCard
                brandPrimaryColor={brandPrimaryColor}
                question={nonQuizActiveQuestion}
                quizProgress={displayedQuizProgress}
                displayedSelected={displayedSelected}
                answeredCurrentQuestion={answeredCurrentQuestion}
                showAcceptedHint={Boolean(acceptedQuestionId) && !answeredCurrentQuestion}
                submittedAnswers={submittedAnswers}
                rankOrder={rankOrder}
                rankRowRefs={rankRowRefs}
                moveRankOption={moveRankOption}
                toggleOption={toggleOption}
                closeQuestionPopup={closeQuestionPopup}
                tagAnswers={tagAnswers}
                setTagAnswers={setTagAnswers}
                canSubmit={canSubmit}
                submit={submit}
                ruBallLabel={ruBallLabel}
              />
            )}
          {joined && showSubQuizCompleteCard && (
            <CompletionOverlay
              brandPrimaryColor={brandPrimaryColor}
              message="Вы прошли все вопросы. Спасибо за участие!"
              compact
              onClose={() => setFinalCompletionDismissed(true)}
            />
          )}
          {joined && showFinishedCompletionCard && (
            <CompletionOverlay
              brandPrimaryColor={brandPrimaryColor}
              message="Спасибо за участие!"
              onClose={() => setFinalCompletionDismissed(true)}
            />
          )}
          {!!error && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          <SpeakerQuestionsDialog
            open={speakerDialogOpen}
            speakerQuestions={speakerQuestions}
            speakerName={speakerName}
            speakerQuestionText={speakerQuestionText}
            onClose={() => setSpeakerDialogOpen(false)}
            onSpeakerNameChange={setSpeakerName}
            onSpeakerQuestionTextChange={setSpeakerQuestionText}
            onSubmit={submitSpeakerQuestion}
            onReact={reactSpeakerQuestion}
          />
          <Dialog
            open={nicknameDialogOpen}
            onClose={() => setNicknameDialogOpen(false)}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>Изменить имя</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                fullWidth
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                placeholder="Введите новое имя"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNicknameDialogOpen(false)}>Отмена</Button>
              <Button variant="contained" onClick={submitNicknameUpdate}>
                Сохранить
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Container>
  );
}
