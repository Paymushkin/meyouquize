import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Avatar, Badge, Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type {
  NetworkingMessage,
  NetworkingThread,
} from "../../../features/quizPlay/usePlayerNetworking";
import { resolveClientAssetUrl } from "../../../utils/resolveClientAssetUrl";

/** Высота BottomNavigation (без зазора до меню). */
const BOTTOM_NAV_HEIGHT_PX = 56;

type Props = {
  threads: NetworkingThread[];
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
  /** Фон своих сообщений = фон кнопки. */
  buttonBackgroundColor: string;
  /** Текст своих сообщений = текст кнопки. */
  buttonTextColor: string;
};

export function PlayerNetworkingChatsPanel(props: Props) {
  const {
    threads,
    activePeerId,
    activePeerLabel = "",
    messages,
    selfParticipantId,
    onOpenThread,
    onSend,
    onCloseChat,
    brandFontFamily,
    brandPrimaryColor,
    buttonBackgroundColor,
    buttonTextColor,
  } = props;
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeThread = threads.find(
    (t) => t.peer.participantId === activePeerId || t.threadId === props.activeThreadId,
  );
  const peerTitle =
    activePeerLabel.trim() ||
    activeThread?.peer.fullName?.trim() ||
    activeThread?.peer.nickname ||
    "Чат";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activePeerId]);

  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  if (activePeerId) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          bottom: BOTTOM_NAV_HEIGHT_PX,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 576,
          zIndex: 19,
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 0.5,
            py: 0.75,
            borderBottom: "1px solid rgba(0,0,0,0.16)",
            flexShrink: 0,
            bgcolor: "#fff",
            minHeight: 52,
          }}
        >
          <IconButton
            onClick={onCloseChat}
            aria-label="Назад"
            sx={{ color: "#111", flexShrink: 0 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            fontWeight={700}
            noWrap
            sx={{ flex: 1, minWidth: 0, pr: 1, fontSize: "1.05rem", color: "#111" }}
          >
            {peerTitle}
          </Typography>
        </Stack>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            px: 1.5,
            py: 1.25,
            bgcolor: "#fff",
          }}
        >
          {messages.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ m: "auto", textAlign: "center" }}
            >
              Напишите первое сообщение
            </Typography>
          ) : null}
          {messages.map((m) => {
            const mine = m.senderId === selfParticipantId;
            return (
              <Box
                key={m.id}
                sx={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: mine ? buttonBackgroundColor : "rgba(0,0,0,0.06)",
                  color: mine ? buttonTextColor : "#111",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {m.text}
                </Typography>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: 1.25,
            py: 1,
            borderTop: "1px solid rgba(0,0,0,0.16)",
            flexShrink: 0,
            bgcolor: "#fff",
          }}
        >
          <TextField
            size="small"
            fullWidth
            multiline
            maxRows={5}
            placeholder="Сообщение"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitDraft();
              }
            }}
            sx={{
              fontFamily: brandFontFamily || undefined,
              "& .MuiOutlinedInput-root": {
                bgcolor: "#f5f5f5",
                color: "#111",
                borderRadius: 2,
                alignItems: "flex-end",
                "& fieldset": { borderColor: "rgba(0,0,0,0.18)" },
                "&:hover fieldset": { borderColor: "rgba(0,0,0,0.35)" },
                "&.Mui-focused fieldset": { borderColor: brandPrimaryColor },
              },
              "& .MuiInputBase-input": {
                color: "#111",
                WebkitTextFillColor: "#111",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.35,
                py: "8.5px",
                "&::placeholder": {
                  color: "rgba(0,0,0,0.45)",
                  opacity: 1,
                  whiteSpace: "nowrap",
                },
              },
            }}
          />
          <IconButton
            onClick={submitDraft}
            disabled={!draft.trim()}
            aria-label="Отправить"
            sx={{
              flexShrink: 0,
              width: 44,
              height: 44,
              bgcolor: brandPrimaryColor,
              color: "#fff",
              "&:hover": { bgcolor: brandPrimaryColor, filter: "brightness(0.92)" },
              "&.Mui-disabled": { bgcolor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.3)" },
            }}
          >
            <SendRoundedIcon sx={{ fontSize: 22, transform: "translateX(1px)" }} />
          </IconButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {threads.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Пока нет чатов. Напишите кому-нибудь из списка гостей.
        </Typography>
      ) : (
        threads.map((t) => {
          const title = t.peer.fullName.trim() || t.peer.nickname;
          const avatar = t.peer.avatarUrl ? resolveClientAssetUrl(t.peer.avatarUrl) : undefined;
          return (
            <Box
              key={t.threadId}
              onClick={() => onOpenThread(t.peer.participantId, t.threadId)}
              sx={{
                display: "flex",
                gap: 1.25,
                alignItems: "center",
                p: 1.25,
                borderRadius: 1,
                bgcolor: "rgba(255,255,255,0.7)",
                cursor: "pointer",
              }}
            >
              <Badge color="error" badgeContent={t.unread} max={99} invisible={!t.unread}>
                <Avatar src={avatar} sx={{ width: 40, height: 40 }}>
                  {title.slice(0, 1).toUpperCase()}
                </Avatar>
              </Badge>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {t.lastMessage?.text ?? "Нет сообщений"}
                </Typography>
              </Box>
            </Box>
          );
        })
      )}
    </Stack>
  );
}
