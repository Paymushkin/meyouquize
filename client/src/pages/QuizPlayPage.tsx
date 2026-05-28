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
import { ruBallLabel, SPEAKER_TILE_ID } from "@meyouquize/shared";
import {
  buildPlayerQuizResultsTilesForPlayer,
  resolveEnabledQuizReportSubQuizIds,
} from "../features/quizPlay/playerQuizResults";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { SpeakerQuestionsDialog } from "../components/quiz/SpeakerQuestionsDialog";
import { PlayerVoteResultsDialog } from "../components/quiz/PlayerVoteResultsDialog";
import { PlayerQuizReportDialog } from "../components/quiz/PlayerQuizReportDialog";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_PAPER_SX,
  PLAYER_DIALOG_TITLE_SX,
} from "../components/quiz/playerDialogStyles";
import { useQuizPlayCompletion } from "../hooks/useQuizPlayCompletion";
import { useQuizPlayScrollLock } from "../hooks/useQuizPlayScrollLock";
import { useQuizPlaySocket } from "../hooks/useQuizPlaySocket";
import { useQuizPlayMetaBranding } from "../hooks/useQuizPlayMetaBranding";
import { useQuizPlayQuestionFlow } from "../hooks/useQuizPlayQuestionFlow";
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

function buildConnectionChip(status: "online" | "reconnecting" | "offline") {
  if (status === "online") {
    return { label: "Онлайн", variant: "filled" as const, accentFill: true as const };
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
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string[]>>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<string[]>([]);
  const [playerAnswersHydrated, setPlayerAnswersHydrated] = useState(false);
  const [error, setError] = useState("");
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
  const [quizReportOpen, setQuizReportOpen] = useState(false);
  const [quizReportSubQuizId, setQuizReportSubQuizId] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const rankRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRankRowTopsRef = useRef<Map<string, number>>(new Map());
  const reactionTimestampsRef = useRef<number[]>([]);
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
  const {
    nonQuizActiveQuestion,
    selected,
    setSelected,
    rankOrder,
    setRankOrder,
    tagAnswers,
    setTagAnswers,
    activeQuestionIdRef,
    activeQuestionTypeRef,
    selectedRef,
    rankOrderRef,
    tagAnswersRef,
    canSubmit,
    toggleOption,
    moveRankOption,
    submit,
    onQuestionSubmitted: handleQuestionSubmitted,
    onQuizJoined: handleQuizJoined,
    closeQuestionPopup,
    resetQuestionFlow,
    answeredCurrentQuestion,
    shouldHideAnsweredPopup,
    shouldHideAnsweredUntilHydrated,
    shouldHideDismissedPopup,
    displayedSelected,
    displayedQuizProgress,
    acceptedQuestionId,
  } = useQuizPlayQuestionFlow({
    quiz,
    submittedQuestionIds,
    submittedAnswers,
    playerAnswersHydrated,
  });
  const handleParticipantMissing = useCallback(() => {
    if (!slug) return;
    const safeNick = (nickname || "").trim() || "Игрок";
    emitJoinWithLog(slug, "restore", safeNick);
  }, [nickname, slug]);

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

  const { titleText, brandPrimaryColor, brandPlayerBackgroundImageUrl, brandBodyBackgroundColor } =
    useQuizPlayMetaBranding({
      slug,
      quiz,
    });

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

  function logoutFromProfile() {
    if (!slug) return;
    const confirmed = window.confirm("Выйти из профиля на этом устройстве?");
    if (!confirmed) return;
    try {
      localStorage.removeItem(getRoomJoinKey(slug));
      localStorage.removeItem(getRoomNickKey(slug));
    } catch {
      // ignore storage errors in private mode
    }
    setNicknameDialogOpen(false);
    setQuiz(null);
    setJoined(false);
    setRestoreJoinPending(false);
    setSubmittedAnswers({});
    setSubmittedQuestionIds([]);
    setPlayerAnswersHydrated(false);
    resetQuestionFlow();
    setError("");
    setSpeakerQuestions(null);
    setSpeakerDialogOpen(false);
    socket.disconnect();
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
  const enabledQuizReportSubQuizIds = useMemo(
    () =>
      resolveEnabledQuizReportSubQuizIds({
        subQuizIds: quiz?.playerQuizResultsSubQuizIds,
        legacyVisible: quiz?.playerQuizResultsTileVisible,
        legacySubQuizId: quiz?.playerQuizResultsSubQuizId,
        subQuizzes: quiz?.playerSubQuizzes,
      }),
    [
      quiz?.playerQuizResultsSubQuizIds,
      quiz?.playerQuizResultsTileVisible,
      quiz?.playerQuizResultsSubQuizId,
      quiz?.playerSubQuizzes,
    ],
  );
  const playerQuizResultsTilesBySubQuizId = useMemo(() => {
    const caption = quiz?.playerQuizResultsTileText?.trim() || "Мой квиз";
    const tiles = buildPlayerQuizResultsTilesForPlayer({
      enabledSubQuizIds: enabledQuizReportSubQuizIds,
      caption,
      subQuizzes: quiz?.playerSubQuizzes,
      scoresBySubQuiz: quiz?.mySubQuizScores,
    });
    return new Map(tiles.map((t) => [t.tileId, t]));
  }, [
    enabledQuizReportSubQuizIds,
    quiz?.playerQuizResultsTileText,
    quiz?.playerSubQuizzes,
    quiz?.mySubQuizScores,
  ]);
  const playerVoteOptionTextColor = quiz?.playerVoteOptionTextColor?.trim() || "#ffffff";
  const playerVoteProgressBarColor = quiz?.playerVoteProgressBarColor?.trim() || "#F3F722";
  const brandTextColor = quiz?.brandTextColor?.trim() || "#111";
  const brandFontFamily = quiz?.brandFontFamily?.trim() || "Jost, Arial, sans-serif";
  const brandLogoUrl = resolveClientAssetUrl(quiz?.brandLogoUrl?.trim() ?? "");
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
  const completionScoreLine =
    typeof quiz?.myTotalScore === "number"
      ? `Ваш результат: ${ruBallLabel(quiz.myTotalScore)}`
      : undefined;
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
    speakerTileVisible ||
    visiblePlayerBanners.length > 0 ||
    (programTileVisible && programTileLinkUrl.length > 0) ||
    enabledQuizReportSubQuizIds.length > 0;
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
              brandPrimaryColor={brandPrimaryColor}
              brandTextColor={brandTextColor}
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
              playerQuizResultsTilesBySubQuizId={playerQuizResultsTilesBySubQuizId}
              onOpenQuizReport={(subQuizId) => {
                setQuizReportSubQuizId(subQuizId);
                setQuizReportOpen(true);
              }}
              playerVoteOptionTextColor={playerVoteOptionTextColor}
              playerVoteProgressBarColor={playerVoteProgressBarColor}
              visibleResultTiles={visibleResultTiles}
              onSelectQuestion={setResultsDialogQuestionId}
            />
          ) : null}
          {!joined && !restoreJoinPending && (
            <JoinCard
              brandPrimaryColor={brandPrimaryColor}
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
          {quiz?.id && quizReportSubQuizId ? (
            <PlayerQuizReportDialog
              open={quizReportOpen}
              quizId={quiz.id}
              subQuizId={quizReportSubQuizId}
              brandPrimaryColor={brandPrimaryColor}
              onClose={() => {
                setQuizReportOpen(false);
                setQuizReportSubQuizId("");
              }}
            />
          ) : null}
          {joined &&
            nonQuizActiveQuestion &&
            !showSubQuizCompleteCard &&
            !shouldHideAnsweredPopup &&
            !shouldHideAnsweredUntilHydrated &&
            !shouldHideDismissedPopup && (
              <QuestionPopupCard
                brandPrimaryColor={brandPrimaryColor}
                playerVoteOptionTextColor={playerVoteOptionTextColor}
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
              scoreLine={completionScoreLine}
              compact
              onClose={() => setFinalCompletionDismissed(true)}
            />
          )}
          {joined && showFinishedCompletionCard && (
            <CompletionOverlay
              brandPrimaryColor={brandPrimaryColor}
              message="Спасибо за участие!"
              scoreLine={completionScoreLine}
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
            PaperProps={{
              sx: PLAYER_DIALOG_PAPER_SX,
            }}
          >
            <DialogTitle sx={PLAYER_DIALOG_TITLE_SX}>Изменить имя</DialogTitle>
            <DialogContent sx={PLAYER_DIALOG_CONTENT_SX}>
              <TextField
                autoFocus
                margin="dense"
                fullWidth
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                placeholder="Введите новое имя"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#fff",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.45)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.72)" },
                    "&.Mui-focused fieldset": { borderColor: brandPrimaryColor },
                  },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 0.5, justifyContent: "space-between" }}>
              <Button
                color="error"
                variant="outlined"
                onClick={logoutFromProfile}
                sx={{ borderColor: "rgba(255, 120, 120, 0.85)", color: "#ff9e9e" }}
              >
                Выйти
              </Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setNicknameDialogOpen(false)} sx={{ color: "#ffffff" }}>
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  onClick={submitNicknameUpdate}
                  sx={{
                    bgcolor: brandPrimaryColor,
                    color: "#111",
                    "&:hover": { bgcolor: brandPrimaryColor, filter: "brightness(0.94)" },
                  }}
                >
                  Сохранить
                </Button>
              </Stack>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Container>
  );
}
