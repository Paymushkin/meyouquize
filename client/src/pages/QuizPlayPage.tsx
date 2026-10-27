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
import {
  buildPhotoWallAlbumPhotos,
  buildVideoWallAlbumVideos,
  photoWallCollagePhotoIndices,
  resolveVideoWallTileCoverUrl,
  ruBallLabel,
  sanitizeVideoWallItems,
  SPEAKER_TILE_ID,
  normalizeNetworkingJoinFormFields,
  normalizeNetworkingJoinFormMode,
  usesExtendedNetworkingJoinForm,
} from "@meyouquize/shared";
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
import { PlayerPhotoWallDialog } from "../components/quiz/PlayerPhotoWallDialog";
import { PlayerVideoWallDialog } from "../components/quiz/PlayerVideoWallDialog";
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
import { buildBrandBackground } from "../features/branding/brandVisual";
import { getNickname, randomNickname, setNickname } from "../storage";
import { socket } from "../socket";
import { useQuizPlayJoin } from "../hooks/useQuizPlayJoin";
import { buildQuizPlayConnectionChip } from "../features/quizPlay/connectionChip";
import { getRoomNickKey, shouldRestoreJoin } from "../features/quizPlay/joinStorage";
import { buildPlayerTilesOrder, getVisiblePlayerBanners } from "../features/quizPlay/tiles";
import { QuestionPopupCard } from "../components/quiz/QuestionPopupCard";
import {
  buildQuizPlayContainerSx,
  CompletionOverlay,
  EventTitleBlock,
  JoinCard,
  JoinNetworkingCard,
  JOIN_SCREEN_MAIN_SX,
  JOIN_SCREEN_STACK_SX,
  buildBrandPrimaryContainedButtonSx,
  PlayerIdentityBar,
  PlayerTilesGrid,
  ReactionsDock,
  RestoreJoinPendingBlock,
  type JoinNetworkingProfileFields,
} from "./quiz-play/QuizPlayBrandingBlocks";
import type { QuizState, ReactionType } from "./quiz-play/types";
import type { SpeakerQuestionsPayload } from "../types/speakerQuestions";
import { resolveClientAssetUrl } from "../utils/resolveClientAssetUrl";
import { usePlayerNetworking } from "../features/quizPlay/usePlayerNetworking";
import {
  PlayerNetworkingShell,
  readStoredNetworkingTab,
  storeNetworkingTab,
  type PlayerNetworkingTab,
} from "../components/quiz/networking/PlayerNetworkingShell";
import { PlayerNetworkingGuestsPanel } from "../components/quiz/networking/PlayerNetworkingGuestsPanel";
import { PlayerNetworkingChatsPanel } from "../components/quiz/networking/PlayerNetworkingChatsPanel";
import { PlayerNetworkingProfileDialog } from "../components/quiz/networking/PlayerNetworkingProfileDialog";

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
  const [photoWallDialogOpen, setPhotoWallDialogOpen] = useState(false);
  const [videoWallDialogOpen, setVideoWallDialogOpen] = useState(false);
  const [bootLoading, setBootLoading] = useState(() => Boolean(slug));
  const [networkingTab, setNetworkingTab] = useState<PlayerNetworkingTab>(() =>
    readStoredNetworkingTab(slug),
  );
  const [networkingProfileOpen, setNetworkingProfileOpen] = useState(false);
  const playContainerRef = useRef<HTMLDivElement | null>(null);
  const guestsScrollTopRef = useRef(0);
  const chatsScrollTopRef = useRef(0);
  const prevActivePeerIdRef = useRef<string | null>(null);
  const activePeerIdRef = useRef<string | null>(null);
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const autoJoinStartedRef = useRef(false);
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
    geoAnswer,
    setGeoAnswer,
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
    clearSubmitInFlight,
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
    const host = window.location.hostname || "";
    const lan =
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    setError(
      lan
        ? "Не удалось восстановить вход. Проверьте Wi‑Fi площадки и обновите страницу ещё раз."
        : "Не удалось подключиться. Проверьте интернет и попробуйте снова.",
    );
  }, []);

  const { joinedRef, requestJoin, requestRestoreJoin, markJoinPersisted } = useQuizPlayJoin({
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

  const persistNickname = useCallback(
    (nextRaw: string) => {
      const next = nextRaw.trim();
      setNick(next);
      setNickname(next);
      if (slug) localStorage.setItem(getRoomNickKey(slug), next);
    },
    [slug],
  );

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

  const handleJoinedNickname = useCallback(
    (next: string) => {
      persistNickname(next);
    },
    [persistNickname],
  );

  useEffect(() => {
    if (!slug) return;
    const roomNickname = localStorage.getItem(getRoomNickKey(slug));
    if (roomNickname) setNick(roomNickname);
  }, [slug]);

  useEffect(() => {
    setNetworkingTab(readStoredNetworkingTab(slug));
    guestsScrollTopRef.current = 0;
    chatsScrollTopRef.current = 0;
  }, [slug]);

  useEffect(() => {
    storeNetworkingTab(slug, networkingTab);
  }, [slug, networkingTab]);

  const handleNetworkingTabChange = useCallback(
    (next: PlayerNetworkingTab) => {
      if (networkingTab === "guests" && next !== "guests") {
        guestsScrollTopRef.current = playContainerRef.current?.scrollTop ?? 0;
      }
      if (networkingTab === "chats" && next !== "chats" && !activePeerIdRef.current) {
        chatsScrollTopRef.current = playContainerRef.current?.scrollTop ?? 0;
      }
      setNetworkingTab(next);
    },
    [networkingTab],
  );

  useLayoutEffect(() => {
    if (networkingTab !== "guests") return;
    const scroller = playContainerRef.current;
    if (!scroller) return;
    scroller.scrollTop = guestsScrollTopRef.current;
  }, [networkingTab]);

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
    hasPlayerOverlay:
      showQuestionPopup ||
      shouldShowFeedbackPopup ||
      speakerDialogOpen ||
      nicknameDialogOpen ||
      networkingProfileOpen ||
      photoWallDialogOpen ||
      videoWallDialogOpen ||
      quizReportOpen ||
      Boolean(resultsDialogQuestionId),
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
    clearSubmitInFlight,
    setError,
    setJoined,
    setConnectionStatus,
    setSpeakerQuestions,
    onParticipantMissing: handleParticipantMissing,
    onQuizJoined: handleJoinSuccess,
    onJoinedNickname: handleJoinedNickname,
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
    brandFontUrls,
    joinMetaLoaded,
    playerAutoJoinRandomNickname,
    networkingEnabled: metaNetworkingEnabled,
    networkingJoinFormMode: metaNetworkingJoinFormMode,
    networkingJoinFormFields: metaNetworkingJoinFormFields,
  } = useQuizPlayMetaBranding({
    slug,
    quiz,
  });

  const networkingJoinFormMode = normalizeNetworkingJoinFormMode(
    quiz?.networkingJoinFormMode ?? metaNetworkingJoinFormMode,
  );
  const networkingJoinFormFields = normalizeNetworkingJoinFormFields(
    quiz?.networkingJoinFormFields ?? metaNetworkingJoinFormFields,
  );
  const networkingEnabledForJoin = Boolean(quiz?.networkingEnabled ?? metaNetworkingEnabled);
  const useExtendedJoinForm = usesExtendedNetworkingJoinForm(
    networkingEnabledForJoin,
    networkingJoinFormMode,
  );
  const showNicknameJoinForm =
    joinMetaLoaded &&
    !joined &&
    !joinPending &&
    (useExtendedJoinForm || !playerAutoJoinRandomNickname);

  const [joinNetworkingDraft, setJoinNetworkingDraft] = useState<JoinNetworkingProfileFields>({
    fullName: "",
    jobTitle: "",
    company: "",
    offers: "",
    seeking: "",
  });
  const pendingNetworkingProfileRef = useRef<JoinNetworkingProfileFields | null>(null);

  useEffect(() => {
    if (!joinMetaLoaded) return;
    if (!slug) {
      setBootLoading(false);
      return;
    }
    if (shouldRestoreJoin(slug, getNickname())) {
      setBootLoading(false);
      return;
    }
    if (useExtendedJoinForm || !playerAutoJoinRandomNickname) {
      setBootLoading(false);
      return;
    }
    if (!autoJoinStartedRef.current) {
      autoJoinStartedRef.current = true;
      setJoinPending(true);
      setError("");
      requestJoin("manual", randomNickname());
    }
    setBootLoading(false);
  }, [
    joinMetaLoaded,
    slug,
    playerAutoJoinRandomNickname,
    useExtendedJoinForm,
    requestJoin,
    setJoinPending,
  ]);

  // Страховка: не держать полноэкранный лоудер бесконечно (Safari/LAN).
  useEffect(() => {
    if (!bootLoading) return;
    const timer = window.setTimeout(() => setBootLoading(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [bootLoading]);

  useEffect(() => {
    if (joined) {
      setJoinPending(false);
      setBootLoading(false);
    }
  }, [joined]);

  useEffect(() => {
    if (joined || joinPending || useExtendedJoinForm || playerAutoJoinRandomNickname) return;
    const timer = window.setTimeout(() => {
      nicknameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [joined, joinPending, playerAutoJoinRandomNickname, useExtendedJoinForm]);

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

  function join() {
    const trimmed = nickname.trim();
    setNicknameError("");
    if (!trimmed) {
      setNicknameError("Введите имя или используйте случайное");
      nicknameInputRef.current?.focus();
      return;
    }
    pendingNetworkingProfileRef.current = null;
    setJoinPending(true);
    setError("");
    requestJoin("manual");
  }

  function joinWithNetworkingProfile() {
    const fullName = joinNetworkingDraft.fullName.trim();
    setNicknameError("");
    if (!fullName) {
      setNicknameError("Укажите ФИО");
      return;
    }
    const nick = fullName.slice(0, 40);
    setNick(nick);
    pendingNetworkingProfileRef.current = {
      fullName,
      jobTitle: joinNetworkingDraft.jobTitle.trim(),
      company: joinNetworkingDraft.company.trim(),
      offers: joinNetworkingDraft.offers.trim(),
      seeking: joinNetworkingDraft.seeking.trim(),
    };
    setJoinPending(true);
    setError("");
    requestJoin("manual", nick);
  }

  function editNickname() {
    if (!joined || !quiz?.id) return;
    if (quiz.networkingEnabled) {
      setNetworkingProfileOpen(true);
      return;
    }
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
    const text = speakerQuestionText.trim();
    if (!quiz?.id || text.length < 3 || !quizSessionReady) return;
    const allowAll = speakerQuestions?.settings.allowAllSpeakersTarget !== false;
    socket.emit("speaker:question:create", {
      quizId: quiz.id,
      speakerName: resolveSpeakerNameForCreate(speakerName, allowAll),
      text,
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
  const networkingEnabled = Boolean(quiz?.networkingEnabled ?? metaNetworkingEnabled);
  const networking = usePlayerNetworking({
    quizId: quiz?.id,
    enabled: networkingEnabled,
    joined,
  });
  activePeerIdRef.current = networking.activePeerId;

  const saveNetworkingProfile = networking.saveProfile;
  useEffect(() => {
    if (!joined || !networkingEnabled || !quiz?.id) return;
    const pending = pendingNetworkingProfileRef.current;
    if (!pending) return;
    pendingNetworkingProfileRef.current = null;
    saveNetworkingProfile({
      fullName: pending.fullName,
      jobTitle: pending.jobTitle,
      company: pending.company,
      offers: pending.offers,
      seeking: pending.seeking,
      visibleInDirectory: true,
    });
  }, [joined, networkingEnabled, quiz?.id, saveNetworkingProfile]);

  const restoreChatsScroll = useCallback(() => {
    const scroller = playContainerRef.current;
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const next = Math.min(Math.max(0, chatsScrollTopRef.current), max);
    scroller.scrollTop = next;
    chatsScrollTopRef.current = next;
  }, []);

  useLayoutEffect(() => {
    if (networkingTab !== "chats" || networking.activePeerId) return;
    restoreChatsScroll();
    // Safari: после display:none→block высота считается со 2-го кадра.
    const raf = window.requestAnimationFrame(() => restoreChatsScroll());
    return () => window.cancelAnimationFrame(raf);
  }, [networkingTab, networking.activePeerId, restoreChatsScroll]);

  useLayoutEffect(() => {
    const prev = prevActivePeerIdRef.current;
    prevActivePeerIdRef.current = networking.activePeerId;
    if (prev && !networking.activePeerId && networkingTab === "chats") {
      restoreChatsScroll();
      const raf = window.requestAnimationFrame(() => restoreChatsScroll());
      return () => window.cancelAnimationFrame(raf);
    }
    return undefined;
  }, [networking.activePeerId, networkingTab, restoreChatsScroll]);

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
  const photoWallTileVisible = quiz?.photoWallTileVisible ?? false;
  const photoWallAlbumPhotos = useMemo(
    () =>
      buildPhotoWallAlbumPhotos({
        baseUrl: quiz?.photoWallBaseUrl ?? "",
        count: quiz?.photoWallImageCount ?? 0,
        ext: quiz?.photoWallImageExt,
      }),
    [quiz?.photoWallBaseUrl, quiz?.photoWallImageCount, quiz?.photoWallImageExt],
  );
  const photoWallCollageSrcs = useMemo(() => {
    if (photoWallAlbumPhotos.length === 0) return [];
    return photoWallCollagePhotoIndices(photoWallAlbumPhotos.length).map(
      (index) => photoWallAlbumPhotos[index]!.src,
    );
  }, [photoWallAlbumPhotos]);
  const videoWallTileVisible = quiz?.videoWallTileVisible ?? false;
  const videoWallHorizontalItems = useMemo(
    () => sanitizeVideoWallItems(quiz?.videoWallHorizontalItems),
    [quiz?.videoWallHorizontalItems],
  );
  const videoWallVerticalItems = useMemo(
    () => sanitizeVideoWallItems(quiz?.videoWallVerticalItems),
    [quiz?.videoWallVerticalItems],
  );
  const videoWallHorizontalPosterUrl = quiz?.videoWallHorizontalPosterUrl ?? "";
  const videoWallVerticalPosterUrl = quiz?.videoWallVerticalPosterUrl ?? "";
  const videoWallTileCoverUrl = useMemo(
    () =>
      resolveVideoWallTileCoverUrl(
        quiz?.videoWallTileCoverUrl,
        videoWallHorizontalPosterUrl,
        videoWallVerticalPosterUrl,
      ),
    [quiz?.videoWallTileCoverUrl, videoWallHorizontalPosterUrl, videoWallVerticalPosterUrl],
  );
  const videoWallHorizontalVideos = useMemo(
    () =>
      buildVideoWallAlbumVideos(
        videoWallHorizontalItems,
        "horizontal",
        videoWallHorizontalPosterUrl,
      ),
    [videoWallHorizontalItems, videoWallHorizontalPosterUrl],
  );
  const videoWallVerticalVideos = useMemo(
    () => buildVideoWallAlbumVideos(videoWallVerticalItems, "vertical", videoWallVerticalPosterUrl),
    [videoWallVerticalItems, videoWallVerticalPosterUrl],
  );
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
  useBrandFont(brandFontFamily, brandFontUrl, brandFontUrls);
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
    (photoWallTileVisible && photoWallCollageSrcs.length > 0) ||
    (videoWallTileVisible && Boolean(videoWallTileCoverUrl)) ||
    enabledQuizReportSubQuizIds.length > 0;
  const visibleResultTiles = useMemo(
    () => quiz?.playerVisibleResults ?? [],
    [quiz?.playerVisibleResults],
  );
  const selectedResultTile = useMemo(
    () => visibleResultTiles.find((item) => item.questionId === resultsDialogQuestionId) ?? null,
    [resultsDialogQuestionId, visibleResultTiles],
  );
  // Снаружи колонки 576px — нейтральный фон; бренд только в контейнере (fixed-слой ниже).
  useBodyBrandBackground({
    backgroundColor: "#111111",
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

  // Слой уже position:fixed — без background-attachment:fixed (ломает Safari).
  const fixedBrandBg = buildBrandBackground({
    backgroundImageUrl: brandPlayerBackgroundImageUrl?.trim() || undefined,
    backgroundAnchor: "bottom",
  });
  return (
    <>
      {/* Фон по ширине контейнера (576), не на весь экран */}
      <Box
        aria-hidden
        sx={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 576,
          zIndex: 0,
          pointerEvents: "none",
          backgroundColor: brandBodyBackgroundColor,
          ...fixedBrandBg,
          backgroundRepeat: "no-repeat",
          backgroundSize: fixedBrandBg.backgroundSize ?? "cover",
        }}
      />
      <Container
        ref={playContainerRef}
        maxWidth={false}
        disableGutters
        sx={{
          ...buildQuizPlayContainerSx({
            brandFontFamily,
            isJoinScreen,
            joined,
            // Цвет/картинка — на fixed-слое выше; контейнер прозрачный.
            backgroundColor: "transparent",
            backgroundImageUrl: undefined,
          }),
          backgroundImage: "none",
          ...(joined
            ? {
                // Скролл на контейнере (не на body) — иначе sticky у фильтров гостей не работает.
                minHeight: "100dvh",
                height: "100dvh",
                overflowY: "auto",
                // overflow-x: hidden ломает position:sticky у фильтров гостей
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": { display: "none" },
                // Иначе 96px container + shell nav = огромная пустота под гостями/чатами.
                ...(networkingEnabled ? { pb: "env(safe-area-inset-bottom, 0px)" } : null),
              }
            : null),
        }}
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
            {joined && !(networkingEnabled && networkingTab !== "feed") ? (
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
            {!(joinPending && !joined) &&
            (isJoinScreen || shouldShowEventTitle) &&
            !(networkingEnabled && networkingTab !== "feed") ? (
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
              networkingEnabled ? (
                <PlayerNetworkingShell
                  tab={networkingTab}
                  onTabChange={handleNetworkingTabChange}
                  unreadTotal={networking.unreadTotal}
                  buttonBackgroundColor={
                    quiz?.networkingNavIconColor?.trim() || formBackgroundColor
                  }
                  buttonTextColor={formTextColor}
                  hideNav={Boolean(networking.activePeerId)}
                >
                  {networkingTab === "feed" ? (
                    <PlayerTilesGrid
                      tileOrder={tileOrder}
                      gridColumns={
                        quiz?.playerTilesGridColumns === 2 || quiz?.playerTilesGridColumns === 3
                          ? quiz.playerTilesGridColumns
                          : 3
                      }
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
                      photoWallTileVisible={photoWallTileVisible}
                      photoWallCollageSrcs={photoWallCollageSrcs}
                      onOpenPhotoWall={() => setPhotoWallDialogOpen(true)}
                      videoWallTileVisible={videoWallTileVisible}
                      videoWallTileCoverUrl={videoWallTileCoverUrl}
                      onOpenVideoWall={() => setVideoWallDialogOpen(true)}
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
                  <Box
                    sx={{ display: networkingTab === "guests" ? "block" : "none" }}
                    aria-hidden={networkingTab !== "guests"}
                  >
                    <PlayerNetworkingGuestsPanel
                      quizId={quiz?.id ?? ""}
                      guests={networking.guests}
                      guestsTotal={networking.guestsTotal}
                      guestsPage={networking.guestsPage}
                      guestsPageCount={networking.guestsPageCount}
                      guestsQuery={networking.guestsQuery}
                      onQueryChange={networking.setGuestsQuery}
                      onSearch={(query) =>
                        networking.refreshGuests(
                          typeof query === "string" ? query : networking.guestsQuery,
                          0,
                        )
                      }
                      onGuestsPageChange={networking.goToGuestsPage}
                      selfParticipantId={networking.selfParticipantId}
                      onOpenProfile={() => setNetworkingProfileOpen(true)}
                      onOpenChat={(peerId, peerMeta) => {
                        handleNetworkingTabChange("chats");
                        networking.openChatWithPeer(peerId, undefined, {
                          ...peerMeta,
                          returnTab: "guests",
                        });
                      }}
                      brandFontFamily={brandFontFamily}
                      brandPrimaryColor={brandPrimaryColor}
                      brandAccentColor={formBackgroundColor}
                      formBackgroundColor={formBackgroundColor}
                      pageBackgroundColor={brandBodyBackgroundColor}
                      formTextColor={formTextColor}
                      formInputTextColor={formInputTextColor}
                      profileBackgroundColor={
                        quiz?.networkingProfileBackgroundColor?.trim() ||
                        brandPrimaryColor ||
                        "#7c5acb"
                      }
                      profileTextColor={
                        quiz?.networkingProfileTextColor?.trim() || formTextColor || "#ffffff"
                      }
                    />
                  </Box>
                  <Box
                    sx={{ display: networkingTab === "chats" ? "block" : "none" }}
                    aria-hidden={networkingTab !== "chats"}
                  >
                    <PlayerNetworkingChatsPanel
                      quizId={quiz?.id ?? ""}
                      threads={networking.threads}
                      threadsHasMore={networking.threadsHasMore}
                      threadsLoadingMore={networking.threadsLoadingMore}
                      onLoadMoreThreads={networking.loadMoreThreads}
                      activePeerId={networking.activePeerId}
                      activeThreadId={networking.activeThreadId}
                      activePeerLabel={networking.activePeerLabel}
                      activePeerAvatarUrl={networking.activePeerAvatarUrl}
                      messages={networking.messages}
                      selfParticipantId={networking.selfParticipantId}
                      onOpenThread={(peerId, threadId) => {
                        chatsScrollTopRef.current = playContainerRef.current?.scrollTop ?? 0;
                        networking.openChatWithPeer(peerId, threadId, { returnTab: "chats" });
                      }}
                      onSend={networking.sendDm}
                      onCloseChat={() => {
                        const returnTab = networking.chatReturnTab;
                        networking.closeChat();
                        if (returnTab && returnTab !== "chats") {
                          handleNetworkingTabChange(returnTab);
                        }
                      }}
                      brandFontFamily={brandFontFamily}
                      brandPrimaryColor={brandPrimaryColor}
                      buttonBackgroundColor={formBackgroundColor}
                      buttonTextColor={formTextColor}
                      pageBackgroundColor={brandBodyBackgroundColor}
                    />
                  </Box>
                </PlayerNetworkingShell>
              ) : (
                <PlayerTilesGrid
                  tileOrder={tileOrder}
                  gridColumns={
                    quiz?.playerTilesGridColumns === 2 || quiz?.playerTilesGridColumns === 3
                      ? quiz.playerTilesGridColumns
                      : 3
                  }
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
                  photoWallTileVisible={photoWallTileVisible}
                  photoWallCollageSrcs={photoWallCollageSrcs}
                  onOpenPhotoWall={() => setPhotoWallDialogOpen(true)}
                  videoWallTileVisible={videoWallTileVisible}
                  videoWallTileCoverUrl={videoWallTileCoverUrl}
                  onOpenVideoWall={() => setVideoWallDialogOpen(true)}
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
              )
            ) : null}
            {!joined && !joinPending && showNicknameJoinForm && (
              <Box sx={JOIN_SCREEN_MAIN_SX}>
                <Stack sx={JOIN_SCREEN_STACK_SX}>
                  {error && !nicknameError ? (
                    <Alert severity="error" sx={{ mb: 0 }}>
                      {error}
                    </Alert>
                  ) : null}
                  {useExtendedJoinForm ? (
                    <JoinNetworkingCard
                      formBackgroundColor={formBackgroundColor}
                      formTextColor={formTextColor}
                      formInputTextColor={formInputTextColor}
                      brandFontFamily={brandFontFamily}
                      values={joinNetworkingDraft}
                      formError={nicknameError}
                      mode={networkingJoinFormMode}
                      fields={networkingJoinFormFields}
                      onChange={(patch) => {
                        setNicknameError("");
                        setJoinNetworkingDraft((prev) => ({ ...prev, ...patch }));
                      }}
                      onJoin={joinWithNetworkingProfile}
                    />
                  ) : (
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
                  )}
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
            <PlayerPhotoWallDialog
              open={photoWallDialogOpen}
              photos={photoWallAlbumPhotos}
              brandFontFamily={brandFontFamily}
              onClose={() => setPhotoWallDialogOpen(false)}
            />
            <PlayerVideoWallDialog
              open={videoWallDialogOpen}
              horizontalVideos={videoWallHorizontalVideos}
              verticalVideos={videoWallVerticalVideos}
              brandFontFamily={brandFontFamily}
              brandPrimaryColor={brandPrimaryColor}
              playerVoteOptionTextColor={playerVoteOptionTextColor}
              onClose={() => setVideoWallDialogOpen(false)}
            />
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
                geoAnswer={geoAnswer}
                setGeoAnswer={setGeoAnswer}
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
            {networkingEnabled ? (
              <PlayerNetworkingProfileDialog
                open={networkingProfileOpen}
                onClose={() => setNetworkingProfileOpen(false)}
                quizId={quiz?.id ?? ""}
                nickname={nickname}
                profile={networking.profile}
                fallbackProfile={
                  networking.guests.find((g) => g.participantId === networking.selfParticipantId) ??
                  null
                }
                onSave={networking.saveProfile}
                onOpenRefresh={networking.refreshProfile}
                mode={networkingJoinFormMode}
                fields={networkingJoinFormFields}
                brandFontFamily={brandFontFamily}
                brandPrimaryColor={brandPrimaryColor}
                formBackgroundColor={formBackgroundColor}
                formTextColor={formTextColor}
                formInputTextColor={formInputTextColor}
              />
            ) : null}
          </>
        ) : null}
      </Container>
    </>
  );
}
