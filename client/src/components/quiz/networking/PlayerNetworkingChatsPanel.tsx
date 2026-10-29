import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DoneIcon from "@mui/icons-material/Done";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  NetworkingMessage,
  NetworkingThread,
} from "../../../features/quizPlay/usePlayerNetworking";
import { useIosKeyboardFixedLayer } from "../../../hooks/useIosKeyboardFixedLayer";
import { resolveClientAssetUrl } from "../../../utils/resolveClientAssetUrl";
import { loadFavoriteParticipantIds } from "./networkingFavorites";

type ChatsFilter = "all" | "new" | "favorites";

const INCOMING_BG = "#ffffff";
const META_IN = "rgba(0,0,0,0.4)";
const TG_LIST_BG = "#ffffff";
const TG_LIST_DIVIDER = "rgba(0,0,0,0.08)";
const TG_LIST_PREVIEW = "rgba(0,0,0,0.45)";
const TG_LIST_TIME = "rgba(0,0,0,0.55)";
const TG_UNREAD_BG = "#111111";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = startOfDay(d);
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (day === today) return "Сегодня";
  if (day === yesterday) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : null),
  });
}

function sameCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return startOfDay(a) === startOfDay(b);
}

function formatThreadListTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = startOfDay(d);
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (day === today) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (day === yesterday) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : null),
  });
}

type Props = {
  quizId: string;
  threads: NetworkingThread[];
  threadsHasMore?: boolean;
  threadsLoadingMore?: boolean;
  onLoadMoreThreads?: () => void;
  activePeerId: string | null;
  activeThreadId: string | null;
  activePeerLabel?: string;
  activePeerAvatarUrl?: string;
  messages: NetworkingMessage[];
  selfParticipantId: string | null;
  onOpenThread: (peerId: string, threadId: string) => void;
  onSend: (text: string) => void;
  onCloseChat: () => void;
  brandFontFamily: string;
  brandPrimaryColor: string;
  /** Акцент бренда (свои баблы). */
  buttonBackgroundColor: string;
  /** Текст на акценте. */
  buttonTextColor: string;
  /** Фон страницы ивента — фон чата. */
  pageBackgroundColor: string;
};

export function PlayerNetworkingChatsPanel(props: Props) {
  const {
    quizId,
    threads,
    threadsHasMore = false,
    threadsLoadingMore = false,
    onLoadMoreThreads,
    activePeerId,
    activePeerLabel = "",
    messages,
    selfParticipantId,
    onOpenThread,
    onSend,
    onCloseChat,
    brandFontFamily,
    buttonBackgroundColor,
    buttonTextColor,
    pageBackgroundColor,
  } = props;
  const [draft, setDraft] = useState("");
  const [chatsFilter, setChatsFilter] = useState<ChatsFilter>("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteParticipantIds(quizId),
  );

  useEffect(() => {
    setFavoriteIds(loadFavoriteParticipantIds(quizId));
    setChatsFilter("all");
  }, [quizId]);

  // Обновляем избранное при возврате на список (после смены вкладки/фокуса).
  useEffect(() => {
    if (activePeerId) return;
    setFavoriteIds(loadFavoriteParticipantIds(quizId));
  }, [activePeerId, quizId, threads]);

  const newCount = useMemo(
    () => threads.reduce((n, t) => n + (t.unread > 0 ? 1 : 0), 0),
    [threads],
  );
  const favoritesInChatsCount = useMemo(
    () => threads.reduce((n, t) => n + (favoriteIds.has(t.peer.participantId) ? 1 : 0), 0),
    [favoriteIds, threads],
  );

  const displayedThreads = useMemo(() => {
    if (chatsFilter === "new") return threads.filter((t) => t.unread > 0);
    if (chatsFilter === "favorites") {
      return threads.filter((t) => favoriteIds.has(t.peer.participantId));
    }
    return threads;
  }, [chatsFilter, favoriteIds, threads]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const conversationShellRef = useRef<HTMLDivElement | null>(null);
  const outgoingBg = buttonBackgroundColor;
  const outgoingFg = buttonTextColor;
  const metaOut = buttonTextColor;
  const activeThread = threads.find(
    (t) => t.peer.participantId === activePeerId || t.threadId === props.activeThreadId,
  );
  const peerTitle =
    activePeerLabel.trim() ||
    activeThread?.peer.fullName?.trim() ||
    activeThread?.peer.nickname ||
    "Чат";
  const peerAvatarSrc =
    (props.activePeerAvatarUrl ? resolveClientAssetUrl(props.activePeerAvatarUrl) : undefined) ||
    (activeThread?.peer.avatarUrl ? resolveClientAssetUrl(activeThread.peer.avatarUrl) : undefined);
  const canSend = Boolean(draft.trim());

  useIosKeyboardFixedLayer(Boolean(activePeerId), conversationShellRef);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activePeerId]);

  useEffect(() => {
    if (activePeerId || !onLoadMoreThreads) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;
    const root = sentinel.closest(".MuiContainer-root");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMoreThreads();
      },
      {
        root: root instanceof Element ? root : null,
        rootMargin: "120px",
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activePeerId, onLoadMoreThreads, threads.length, threadsHasMore]);

  // Не автофокусим поле при открытии — iOS Safari зумит страницу.

  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  const conversation =
    activePeerId && typeof document !== "undefined"
      ? createPortal(
          <Box
            ref={conversationShellRef}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              mx: "auto",
              width: "100%",
              maxWidth: 576,
              // До гидрации хука — высота экрана; дальше top/height пишет useIosKeyboardFixedLayer.
              height: "100dvh",
              minHeight: "100dvh",
              maxHeight: "100dvh",
              zIndex: 1400,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              overscrollBehavior: "none",
              touchAction: "manipulation",
              WebkitTextSizeAdjust: "100%",
              textSizeAdjust: "100%",
              bgcolor: pageBackgroundColor,
              backgroundImage: `
            radial-gradient(circle at 12% 18%, rgba(255,255,255,0.2) 0 1.5px, transparent 2px),
            radial-gradient(circle at 72% 32%, rgba(255,255,255,0.14) 0 1.5px, transparent 2px),
            radial-gradient(circle at 38% 64%, rgba(0,0,0,0.08) 0 1.2px, transparent 2px),
            radial-gradient(circle at 88% 78%, rgba(255,255,255,0.12) 0 1.5px, transparent 2px)
          `,
              backgroundSize: "48px 48px, 64px 64px, 40px 40px, 56px 56px",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                px: 0.75,
                py: 0.75,
                flex: "0 0 auto",
                minHeight: 56,
                bgcolor: "rgba(246,246,246,0.92)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <IconButton
                onClick={onCloseChat}
                aria-label="Назад"
                sx={{ color: "#111", flexShrink: 0, width: 40, height: 40 }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0, textAlign: "center", px: 0.5 }}>
                <Typography
                  noWrap
                  sx={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    lineHeight: 1.2,
                    color: "#111",
                    fontFamily: brandFontFamily || undefined,
                  }}
                >
                  {peerTitle}
                </Typography>
              </Box>
              <Avatar
                src={peerAvatarSrc}
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  mr: 0.5,
                  bgcolor: "grey.200",
                  color: "#111",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                {peerTitle.slice(0, 1).toUpperCase()}
              </Avatar>
            </Stack>

            <Box
              sx={{
                // Единственная скроллящаяся зона: шапка и инпут снаружи.
                flex: "1 1 0",
                minHeight: 0,
                overflowX: "hidden",
                overflowY: "auto",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
                display: "flex",
                flexDirection: "column",
                gap: 1.75,
                px: 1,
                py: 1.25,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {messages.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    m: "auto",
                    textAlign: "center",
                    px: 2,
                    py: 0.75,
                    borderRadius: 999,
                    bgcolor: "rgba(0,0,0,0.22)",
                    color: "#fff",
                    fontSize: "0.8rem",
                  }}
                >
                  Напишите первое сообщение
                </Typography>
              ) : null}
              {messages.map((m, index) => {
                const mine = m.senderId === selfParticipantId;
                const prev = index > 0 ? messages[index - 1] : null;
                const next = index < messages.length - 1 ? messages[index + 1] : null;
                const showDay = !prev || !sameCalendarDay(prev.createdAt, m.createdAt);
                const sameAsPrev =
                  Boolean(prev) &&
                  prev!.senderId === m.senderId &&
                  sameCalendarDay(prev!.createdAt, m.createdAt);
                const sameAsNext =
                  Boolean(next) &&
                  next!.senderId === m.senderId &&
                  sameCalendarDay(next!.createdAt, m.createdAt);
                const showTail = !sameAsNext;
                const timeLabel = formatMessageTime(m.createdAt);
                const read = Boolean(m.readAt);
                const bubbleBg = mine ? outgoingBg : INCOMING_BG;
                const bubbleFg = mine ? outgoingFg : "#111";

                const radius = mine
                  ? `${sameAsPrev ? 6 : 16}px ${showTail ? 4 : sameAsPrev ? 6 : 16}px ${showTail ? 4 : 6}px ${sameAsPrev ? 6 : 16}px`
                  : `${showTail ? 4 : sameAsPrev ? 6 : 16}px ${sameAsPrev ? 6 : 16}px ${sameAsPrev ? 6 : 16}px ${showTail ? 4 : 6}px`;

                return (
                  <Fragment key={m.id}>
                    {showDay ? (
                      <Typography
                        variant="caption"
                        sx={{
                          alignSelf: "center",
                          my: 0.5,
                          px: 1.35,
                          py: 0.4,
                          borderRadius: 999,
                          bgcolor: "rgba(0,0,0,0.22)",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {formatDayLabel(m.createdAt)}
                      </Typography>
                    ) : null}
                    <Box
                      sx={{
                        position: "relative",
                        alignSelf: mine ? "flex-end" : "flex-start",
                        maxWidth: "82%",
                        mt: sameAsPrev ? -0.5 : 0,
                        px: 1.15,
                        pt: 0.75,
                        pb: 0.55,
                        borderRadius: radius,
                        bgcolor: bubbleBg,
                        color: bubbleFg,
                        boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                        "&::after": showTail
                          ? {
                              content: '""',
                              position: "absolute",
                              bottom: 0,
                              [mine ? "right" : "left"]: -6,
                              width: 10,
                              height: 14,
                              bgcolor: bubbleBg,
                              clipPath: mine
                                ? "polygon(0 0, 0 100%, 100% 100%)"
                                : "polygon(100% 0, 0 100%, 100% 100%)",
                              filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.04))",
                            }
                          : undefined,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: "0.95rem",
                          lineHeight: 1.35,
                          fontFamily: brandFontFamily || undefined,
                        }}
                      >
                        {m.text}
                      </Typography>
                      {timeLabel ? (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 0.25,
                            mt: 0.4,
                            userSelect: "none",
                            color: mine ? metaOut : META_IN,
                            opacity: mine ? 0.7 : 1,
                            fontSize: "0.68rem",
                            lineHeight: 1,
                          }}
                        >
                          {timeLabel}
                          {mine ? (
                            read ? (
                              <DoneAllIcon sx={{ fontSize: 14, color: "inherit" }} />
                            ) : (
                              <DoneIcon sx={{ fontSize: 14, color: "inherit" }} />
                            )
                          ) : null}
                        </Box>
                      ) : null}
                    </Box>
                  </Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            <Box
              sx={{
                px: 1,
                pt: 0.75,
                pb: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                flex: "0 0 auto",
                bgcolor: "transparent",
              }}
            >
              <Box sx={{ position: "relative", width: "100%" }}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Сообщение"
                  value={draft}
                  inputRef={inputRef}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => {
                    // iOS иначе скроллит документ к полю и ломает fixed-слой.
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    window.setTimeout(() => {
                      window.scrollTo(0, 0);
                      messagesEndRef.current?.scrollIntoView({ block: "end" });
                    }, 50);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitDraft();
                    }
                  }}
                  sx={{
                    fontFamily: brandFontFamily || undefined,
                    "& .MuiOutlinedInput-root": {
                      minHeight: 48,
                      bgcolor: "#fff",
                      color: "#111",
                      borderRadius: 4,
                      alignItems: "center",
                      pr: "48px",
                      py: 0,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      "& fieldset": { borderColor: "transparent" },
                      "&:hover fieldset": { borderColor: "transparent" },
                      "&.Mui-focused fieldset": { borderColor: "transparent" },
                    },
                    "& .MuiInputBase-input": {
                      color: "#111",
                      WebkitTextFillColor: "#111",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.35,
                      // ≥16px — иначе iOS Safari зумит страницу при фокусе.
                      fontSize: "16px",
                      py: "12px",
                      px: 1,
                      "&::placeholder": {
                        color: "rgba(0,0,0,0.35)",
                        opacity: 0.55,
                        whiteSpace: "nowrap",
                        fontSize: "16px",
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={submitDraft}
                  disabled={!canSend}
                  aria-label="Отправить"
                  sx={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    bgcolor: canSend ? buttonBackgroundColor : "transparent",
                    color: canSend ? buttonTextColor : "rgba(0,0,0,0.28)",
                    "&:hover": {
                      bgcolor: canSend ? buttonBackgroundColor : "rgba(0,0,0,0.04)",
                      filter: canSend ? "brightness(0.96)" : undefined,
                    },
                    "&.Mui-disabled": {
                      bgcolor: "transparent",
                      color: "rgba(0,0,0,0.28)",
                    },
                  }}
                >
                  <SendRoundedIcon sx={{ fontSize: 20, transform: "translateX(1px)" }} />
                </IconButton>
              </Box>
            </Box>
          </Box>,
          document.body,
        )
      : null;

  return (
    <>
      <Box
        sx={{
          display: activePeerId ? "none" : "block",
          // Компенсируем pt/px контейнера. Без minHeight:100dvh — Safari скроллит «пустой» лист.
          mt: -2,
          mx: -2,
          mb: 0,
          pt: 2,
          pb: 0,
          bgcolor: TG_LIST_BG,
        }}
      >
        {threads.length > 0 ? (
          <Box sx={{ px: 1.5, pb: 1.25 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              fullWidth
              value={chatsFilter}
              onChange={(_, value: ChatsFilter | null) => {
                if (value) setChatsFilter(value);
              }}
              sx={{
                "& .MuiToggleButton-root": {
                  color: buttonTextColor,
                  borderColor: buttonBackgroundColor,
                  bgcolor: `${buttonBackgroundColor}59`,
                  px: 1.25,
                  textTransform: "none",
                  fontFamily: brandFontFamily || undefined,
                  "&:hover": { bgcolor: `${buttonBackgroundColor}80` },
                  "&.Mui-selected": {
                    color: buttonTextColor,
                    bgcolor: buttonBackgroundColor,
                    borderColor: buttonBackgroundColor,
                    "&:hover": { bgcolor: buttonBackgroundColor, opacity: 0.92 },
                  },
                },
              }}
            >
              <ToggleButton value="all">Все · {threads.length}</ToggleButton>
              <ToggleButton value="new">Новые · {newCount}</ToggleButton>
              <ToggleButton value="favorites">Избранные · {favoritesInChatsCount}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ) : null}

        {threads.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: TG_LIST_PREVIEW,
              textAlign: "center",
              py: 4,
              px: 2,
              fontFamily: brandFontFamily || undefined,
            }}
          >
            Пока нет чатов. Напишите кому-нибудь из списка гостей.
          </Typography>
        ) : displayedThreads.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: TG_LIST_PREVIEW,
              textAlign: "center",
              py: 4,
              px: 2,
              fontFamily: brandFontFamily || undefined,
            }}
          >
            {chatsFilter === "new"
              ? "Нет непрочитанных чатов"
              : chatsFilter === "favorites"
                ? "Нет чатов с избранными — добавьте гостя в ★"
                : "Пока нет чатов"}
          </Typography>
        ) : (
          displayedThreads.map((t) => {
            const title = t.peer.fullName.trim() || t.peer.nickname;
            const avatar = t.peer.avatarUrl ? resolveClientAssetUrl(t.peer.avatarUrl) : undefined;
            const timeIso = t.lastMessage?.createdAt || t.updatedAt;
            const timeLabel = formatThreadListTime(timeIso);
            const preview = t.lastMessage?.text?.trim() || "Нет сообщений";
            const unread = t.unread || 0;
            return (
              <Box
                key={t.threadId}
                onClick={() => onOpenThread(t.peer.participantId, t.threadId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenThread(t.peer.participantId, t.threadId);
                  }
                }}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                  px: 1.5,
                  py: 1.1,
                  minHeight: 72,
                  cursor: "pointer",
                  bgcolor: TG_LIST_BG,
                  "&:active": { bgcolor: "rgba(0,0,0,0.04)" },
                  "&:hover": { bgcolor: "rgba(0,0,0,0.03)" },
                }}
              >
                <Avatar
                  src={avatar}
                  sx={{
                    width: 54,
                    height: 54,
                    flexShrink: 0,
                    bgcolor: "grey.300",
                    color: "#111",
                    fontWeight: 700,
                    fontSize: "1.15rem",
                  }}
                >
                  {title.slice(0, 1).toUpperCase()}
                </Avatar>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: 0.25,
                    alignSelf: "stretch",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    borderBottom: `1px solid ${TG_LIST_DIVIDER}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        lineHeight: 1.25,
                        color: "#111",
                        fontFamily: brandFontFamily || undefined,
                      }}
                    >
                      {title}
                    </Typography>
                    {timeLabel ? (
                      <Typography
                        component="span"
                        sx={{
                          flexShrink: 0,
                          fontSize: "0.75rem",
                          color: TG_LIST_TIME,
                          lineHeight: 1.2,
                        }}
                      >
                        {timeLabel}
                      </Typography>
                    ) : null}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mt: 0.35,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        flex: "1 1 0",
                        width: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: "0.875rem",
                        color: TG_LIST_PREVIEW,
                        lineHeight: 1.3,
                        fontFamily: brandFontFamily || undefined,
                      }}
                    >
                      {preview}
                    </Typography>
                    {unread > 0 ? (
                      <Box
                        sx={{
                          flexShrink: 0,
                          minWidth: 22,
                          height: 22,
                          px: 0.65,
                          borderRadius: 999,
                          bgcolor: TG_UNREAD_BG,
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        {unread > 99 ? "99+" : unread}
                      </Box>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
        {threadsHasMore ? (
          <Box
            ref={loadMoreSentinelRef}
            sx={{
              py: 1.5,
              display: "flex",
              justifyContent: "center",
              minHeight: 40,
            }}
          >
            {threadsLoadingMore ? <CircularProgress size={22} thickness={4} /> : null}
          </Box>
        ) : null}
      </Box>
      {conversation}
    </>
  );
}
