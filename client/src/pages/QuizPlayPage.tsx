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
import { FeedbackPopupCard } from "../components/quiz/FeedbackPopupCard";
import { SpeakerQuestionsDialog } from "../components/quiz/SpeakerQuestionsDialog";
import {
  normalizeSpeakerUiSelection,
  resolveSpeakerNameForCreate,
} from "../features/speakerQuestions/speakerTargetUi";
import { PlayerVoteResultsDialog } from "../components/quiz/PlayerVoteResultsDialog";
import { PlayerQuizReportDialog } from "../components/quiz/PlayerQuizReportDialog";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_TITLE_SX,
  buildPlayerDialogPaperSx,
  buildPlayerDialogTextFieldSx,
} from "../components/quiz/playerDialogStyles";
import { useQuizPlayCompletion } from "../hooks/useQuizPlayCompletion";
import { useQuizPlayScrollLock } from "../hooks/useQuizPlayScrollLock";
import { useQuizPlaySocket } from "../hooks/useQuizPlaySocket";
import { useQuizPlayMetaBranding } from "../hooks/useQuizPlayMetaBranding";
import { useQuizPlayFeedback } from "../hooks/useQuizPlayFeedback";
import { useQuizPlayQuestionFlow } from "../hooks/useQuizPlayQuestionFlow";
import { useBrandFont } from "../hooks/useBrandFont";
import { useBodyBrandBackground } from "../hooks/useBodyBrandBackground";
import { useEventFavicon } from "../hooks/useEventFavicon";
import { getNickname, randomNickname, setNickname } from "../storage";
import { socket } from "../socket";
import { useQuizPlayJoin } from "../hooks/useQuizPlayJoin";
import { buildQuizPlayConnectionChip } from "../features/quizPlay/connectionChip";
import { getRoomNickKey, shouldRestoreJoin } from "../features/quizPlay/joinStorage";
import { buildPlayerTilesOrder, getVisiblePlayerBanners } from "../features/quizPlay/tiles";
import { QuestionPopupCard } from "../components/quiz/QuestionPopupCard";
import { PlayerViewportBackground } from "../components/quiz/PlayerViewportBackground";
import {
  buildQuizPlayContainerSx,
  CompletionOverlay,
  EventTitleBlock,
  JoinCard,
  JOIN_SCREEN_MAIN_SX,
  JOIN_SCREEN_STACK_SX,
  buildBrandPrimaryContainedButtonSx,
  PlayerIdentityBar,
  PlayerTilesGrid,
  ReactionsDock,
  RestoreJoinPendingBlock,
} from "./quiz-play/QuizPlayBrandingBlocks";
import type { QuizState, ReactionType } from "./quiz-play/types";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";

const REACTION_WINDOW_MS = 1000;
const REACTION_MAX_PER_WINDOW = 10;

export function QuizPlayPage() {
  const { slug = "" } = useParams();
  const [nickname, setNick] = useState(() => {
    const roomNickname = slug ? localStorage.getItem(getRoomNickKey(slug)) : "";
    return roomNickname || getNickname() || "";
  });
  const [joined, setJoined] = useState(false);
  const [quizSessionReady, setQuizSessionReady] = useState(false);
  const [joinPending, setJoinPending] = useState(() => shouldRestoreJoin(slug, getNickname()));
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string[]>>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<string[]>([]);
  const [playerAnswersHydrated, setPlayerAnswersHydrated] = useState(false);
  const [error, setError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
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
  const [bootLoading, setBootLoading] = useState(() => shouldRestoreJoin(slug, getNickname()));
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
    pendingSubmitPayloadRef,
  } = useQuizPlayQuestionFlow({
    quiz,
    submittedQuestionIds,
    submittedAnswers,
    playerAnswersHydrated,
    quizSessionReady,
  });
  const {
    shouldShowFeedbackPopup,
    shouldDeferQuestionPopup,
    scaleAnswers,
    openFieldAnswers,
    setOpenFieldAnswer,
    selectScaleOption,
    closeFeedbackPopup,
    canSubmitFeedback,
    submitFeedback,
    submitting: feedbackSubmitting,
    submitError: feedbackSubmitError,
  } = useQuizPlayFeedback({
    quizId: quiz?.id,
    activeFeedbackForm: quiz?.activeFeedbackForm,
    feedbackSubmittedFromState: quiz?.feedbackSubmitted,
    joined,
  });
  const onJoinTimeout = useCallback(() => {
    setError("Не удалось подключиться. Проверьте интернет и попробуйте снова.");
  }, []);

  const { joinedRef, requestJoin, requestRestoreJoin, markJoinPersisted, clearJoinPersisted } =
    useQuizPlayJoin({
      slug,
      nickname,
      joined,
      joinPending,
      setJoinPending,
      setBootLoading,
      onJoinTimeout,
    });

  const handleParticipantMissing = useCallback(() => {
    requestRestoreJoin();
  }, [requestRestoreJoin]);

  const handleJoinFailed = useCallback(() => {
    clearJoinPersisted();
    setJoinPending(false);
    setJoined(false);
    setNicknameError("Такое имя уже занято");
  }, [clearJoinPersisted]);

  const clearJoinPending = useCallback(() => {
    setJoinPending(false);
    setBootLoading(false);
  }, []);

  const handleJoinSuccess = useCallback(() => {
    markJoinPersisted();
    setError("");
    setNicknameError("");
    handleQuizJoined();
  }, [handleQuizJoined, markJoinPersisted]);

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

  const isJoinScreen = !bootLoading && !joined && !joinPending;

  const showQuestionPopup =
    joined &&
    !!nonQuizActiveQuestion &&
    !showSubQuizCompleteCard &&
    !shouldDeferQuestionPopup &&
    !shouldHideAnsweredPopup &&
    !shouldHideAnsweredUntilHydrated &&
    !shouldHideDismissedPopup;

  useQuizPlayScrollLock({
    joined,
    hasPlayerOverlay: showQuestionPopup || shouldShowFeedbackPopup,
  });

  useEffect(() => {
    if (!joined) {
      setQuizSessionReady(false);
    }
  }, [joined]);

  useQuizPlaySocket({
    activeQuestionIdRef,
    activeQuestionTypeRef,
    selectedRef,
    rankOrderRef,
    tagAnswersRef,
    pendingSubmitPayloadRef,
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
    onQuizJoined: handleJoinSuccess,
    onJoinFailed: handleJoinFailed,
    onJoinSettled: clearJoinPending,
    joinedRef,
    onQuizSessionReadyChange: setQuizSessionReady,
  });

  useEffect(() => {
    if (!slug || !joined) return;
    socket.emit("speaker:questions:subscribe", { slug, viewer: "player" });
  }, [slug, joined]);

  const {
    titleText,
    brandPrimaryColor,
    formTextColor,
    formBackgroundColor,
    formInputTextColor,
    brandPlayerBackgroundImageUrl,
    brandBodyBackgroundColor,
    brandLogoUrl,
    brandFontFamily,
    brandFontUrl,
  } = useQuizPlayMetaBranding({
    slug,
    quiz,
  });

  useEffect(() => {
    if (joined) {
      setJoinPending(false);
      setBootLoading(false);
    }
  }, [joined]);

  useEffect(() => {
    if (joined || joinPending) return;
    const timer = window.setTimeout(() => {
      nicknameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [joined, joinPending]);

  useEffect(() => {
    const settings = speakerQuestions?.settings;
    if (!settings) return;
    const speakers = settings.speakers ?? [];
    const allowAll = settings.allowAllSpeakersTarget !== false;
    const next = normalizeSpeakerUiSelection(speakerName, allowAll, speakers);
    if (next !== speakerName) {
      setSpeakerName(next);
    }
  }, [speakerQuestions, speakerName]);

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
    setNicknameError("");
    if (!trimmed) {
      setNicknameError("Введите имя или используйте случайное");
      nicknameInputRef.current?.focus();
      return;
    }
    setJoinPending(true);
    setError("");
    requestJoin("manual");
    persistNickname(trimmed);
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

  function submitSpeakerQuestion() {
    if (!quiz?.id || !speakerQuestionText.trim() || !quizSessionReady) return;
    const allowAll = speakerQuestions?.settings.allowAllSpeakersTarget !== false;
    socket.emit("speaker:question:create", {
      quizId: quiz.id,
      speakerName: resolveSpeakerNameForCreate(speakerName, allowAll),
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

  function deleteSpeakerQuestion(questionId: string) {
    if (!quiz?.id) return;
    socket.emit("speaker:question:delete", {
      quizId: quiz.id,
      speakerQuestionId: questionId,
    });
  }

  function toggleReaction(reactionType: ReactionType) {
    if (!quiz?.id || !quizSessionReady) return;
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
  const speakerTileVisible = quiz?.speakerTileVisible ?? false;
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
  useBrandFont(brandFontFamily, brandFontUrl);
  useEventFavicon(brandLogoUrl);
  const tileOrder = useMemo(
    () => buildPlayerTilesOrder(quiz?.playerTilesOrder, visiblePlayerBanners),
    [quiz?.playerTilesOrder, visiblePlayerBanners],
  );
  const connectionChip = buildQuizPlayConnectionChip(connectionStatus, quizSessionReady);
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
  useBodyBrandBackground({
    backgroundColor: brandBodyBackgroundColor,
    clearRootBackground: true,
    resetOverflowX: true,
  });

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
    <>
      <PlayerViewportBackground
        backgroundColor={brandBodyBackgroundColor}
        backgroundImageUrl={brandPlayerBackgroundImageUrl}
      />
      <Container
        maxWidth="md"
        sx={buildQuizPlayContainerSx({
          brandFontFamily,
          isJoinScreen,
          joined,
        })}
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
                formBackgroundColor={formBackgroundColor}
                formTextColor={formTextColor}
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
            {!(joinPending && !joined) && (isJoinScreen || shouldShowEventTitle) ? (
              <EventTitleBlock
                joined={joined}
                isJoinScreen={isJoinScreen}
                shouldShowEventTitle={shouldShowEventTitle}
                joinPending={joinPending}
                hasActiveQuestion={hasActiveQuestion}
                brandLogoUrl={brandLogoUrl}
                brandFontFamily={brandFontFamily}
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
                onBannerClick={(bannerId) => {
                  if (!quiz?.id) return;
                  socket.emit("banner:click", { quizId: quiz.id, bannerId });
                }}
              />
            ) : null}
            {!joined && !joinPending && (
              <Box sx={JOIN_SCREEN_MAIN_SX}>
                <Stack sx={JOIN_SCREEN_STACK_SX}>
                  {error && !nicknameError ? (
                    <Alert severity="error" sx={{ mb: 0 }}>
                      {error}
                    </Alert>
                  ) : null}
                  <JoinCard
                    formBackgroundColor={formBackgroundColor}
                    formTextColor={formTextColor}
                    formInputTextColor={formInputTextColor}
                    brandFontFamily={brandFontFamily}
                    nickname={nickname}
                    nicknameError={nicknameError}
                    nicknameInputRef={nicknameInputRef}
                    onNicknameChange={(value) => {
                      setNicknameError("");
                      setNick(value);
                    }}
                    onRandomNickname={() => {
                      setNicknameError("");
                      setNick(randomNickname());
                    }}
                    onJoin={join}
                  />
                </Stack>
              </Box>
            )}
            {!joined && joinPending && <RestoreJoinPendingBlock />}
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
            {showQuestionPopup && (
              <QuestionPopupCard
                brandPrimaryColor={brandPrimaryColor}
                playerVoteOptionTextColor={playerVoteOptionTextColor}
                question={nonQuizActiveQuestion}
                quizProgress={displayedQuizProgress}
                displayedSelected={displayedSelected}
                answeredCurrentQuestion={answeredCurrentQuestion}
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
            {joined && shouldShowFeedbackPopup && quiz?.activeFeedbackForm ? (
              <FeedbackPopupCard
                brandPrimaryColor={brandPrimaryColor}
                playerVoteOptionTextColor={playerVoteOptionTextColor}
                form={quiz.activeFeedbackForm}
                scaleAnswers={scaleAnswers}
                openFieldAnswers={openFieldAnswers}
                onOpenFieldChange={setOpenFieldAnswer}
                onSelectOption={selectScaleOption}
                onClose={closeFeedbackPopup}
                canSubmit={canSubmitFeedback}
                submitting={feedbackSubmitting}
                submitError={feedbackSubmitError}
                onSubmit={submitFeedback}
              />
            ) : null}
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
            {joined && !!error ? (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : null}
            <SpeakerQuestionsDialog
              open={speakerDialogOpen}
              speakerQuestions={speakerQuestions}
              speakerName={speakerName}
              speakerQuestionText={speakerQuestionText}
              formBackgroundColor={formBackgroundColor}
              formTextColor={formTextColor}
              formInputTextColor={formInputTextColor}
              brandFontFamily={brandFontFamily}
              onClose={() => setSpeakerDialogOpen(false)}
              onSpeakerNameChange={setSpeakerName}
              onSpeakerQuestionTextChange={setSpeakerQuestionText}
              onSubmit={submitSpeakerQuestion}
              onReact={reactSpeakerQuestion}
              onDelete={deleteSpeakerQuestion}
            />
            <Dialog
              open={nicknameDialogOpen}
              onClose={() => setNicknameDialogOpen(false)}
              fullWidth
              maxWidth="xs"
              PaperProps={{
                sx: buildPlayerDialogPaperSx(brandFontFamily),
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
                  sx={buildPlayerDialogTextFieldSx(
                    formBackgroundColor,
                    formInputTextColor,
                    brandFontFamily,
                  )}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2, pt: 0.5, justifyContent: "space-between" }}>
                <Button
                  onClick={() => setNicknameDialogOpen(false)}
                  sx={{ color: formInputTextColor }}
                >
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  onClick={submitNicknameUpdate}
                  sx={buildBrandPrimaryContainedButtonSx(formBackgroundColor, formTextColor)}
                >
                  Сохранить
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : null}
      </Container>
    </>
  );
}
