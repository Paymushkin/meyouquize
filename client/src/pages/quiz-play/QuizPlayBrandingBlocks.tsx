/* eslint-disable react-refresh/only-export-components */
import { PROGRAM_TILE_ID, SPEAKER_TILE_ID } from "../../publicViewContract";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  OutlinedInput,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { ActiveQuestion, QuizState, ReactionType } from "./types";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";
import { sanitizeClientAssetUrl, sanitizeExternalHttpUrl } from "../../utils/safeUrls";

type BannerTile = {
  id: string;
  linkUrl: string;
  backgroundUrl: string;
  size: "2x1" | "1x1" | "full";
};

function getQuestionTypeLabel(question: ActiveQuestion): string {
  if (question.type === "single") return "Один ответ";
  if (question.type === "multi") return "Несколько ответов";
  if (question.type === "ranking") return question.rankingKind === "jury" ? "Жюри" : "Ранжирование";
  return "Облако тегов";
}

type QuizPlayContainerSxParams = {
  brandBackground: Record<string, string>;
  brandFontFamily: string;
  hasActiveQuestion: boolean;
};

export function buildQuizPlayContainerSx(params: QuizPlayContainerSxParams): SxProps<Theme> {
  const { brandBackground, brandFontFamily, hasActiveQuestion } = params;
  return {
    ...brandBackground,
    fontFamily: brandFontFamily,
    fontStyle: "normal",
    "&, & *": {
      fontStyle: "normal",
    },
    "& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiFormLabel-root":
      {
        fontFamily: brandFontFamily,
        fontStyle: "normal",
      },
    pt: 2,
    maxWidth: "678px !important",
    pb: {
      xs: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
      sm: 4,
    },
    minHeight: "100vh",
    height: hasActiveQuestion ? "auto" : "100dvh",
    overflowY: hasActiveQuestion ? "auto" : "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  };
}

type EventTitleBlockProps = {
  joined: boolean;
  shouldShowEventTitle: boolean;
  restoreJoinPending: boolean;
  hasActiveQuestion: boolean;
  brandLogoUrl: string;
  titleText: string;
};

export function EventTitleBlock(props: EventTitleBlockProps) {
  const {
    joined,
    shouldShowEventTitle,
    restoreJoinPending,
    hasActiveQuestion,
    brandLogoUrl,
    titleText,
  } = props;
  const safeBrandLogoUrl = sanitizeClientAssetUrl(brandLogoUrl);
  const normalizedTitleText = titleText.trim();
  if (
    (!joined && restoreJoinPending) ||
    (!joined && !shouldShowEventTitle) ||
    (joined && !shouldShowEventTitle) ||
    (!safeBrandLogoUrl && normalizedTitleText.length < 1)
  ) {
    return null;
  }
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: joined ? 0 : { xs: 96, sm: 128 },
        width: "100%",
        ...(hasActiveQuestion ? { minHeight: 0, mb: 2 } : {}),
        ...(joined ? { mb: 4 } : {}),
        ...(!joined ? { flex: 1 } : {}),
      }}
    >
      <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
        {safeBrandLogoUrl ? (
          <Box
            component="img"
            src={resolveClientAssetUrl(safeBrandLogoUrl)}
            alt="Логотип"
            sx={{
              alignSelf: "flex-start",
              mb: 1.5,
              maxHeight: 56,
              maxWidth: "min(60vw, 280px)",
              objectFit: "contain",
            }}
          />
        ) : null}
        {normalizedTitleText ? (
          <Typography
            variant="h3"
            gutterBottom
            align="left"
            sx={{
              width: "100%",
              fontWeight: 400,
              fontStyle: "normal",
              letterSpacing: 0.2,
              fontSize: "clamp(1.6rem, 4.8vw, 2.8rem)",
              whiteSpace: "pre-line",
              mb: 4,
            }}
          >
            {titleText}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

type PlayerTilesGridProps = {
  tileOrder: string[];
  visibleBannerById: Map<string, BannerTile>;
  speakerEnabled: boolean;
  speakerTileVisible: boolean;
  onSpeakerOpen: () => void;
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  brandPrimaryColor: string;
  speakerTileText: string;
  programTileText: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
  programTileLinkUrl: string;
  programTileVisible: boolean;
  playerVoteOptionTextColor: string;
  playerVoteProgressBarColor: string;
  visibleResultTiles: NonNullable<QuizState["playerVisibleResults"]>;
  onSelectQuestion: (questionId: string) => void;
};

export function PlayerTilesGrid(props: PlayerTilesGridProps) {
  const {
    tileOrder,
    visibleBannerById,
    speakerEnabled,
    speakerTileVisible,
    onSpeakerOpen,
    speakerTileBackgroundColor,
    speakerTileTextColor,
    brandPrimaryColor,
    speakerTileText,
    programTileText,
    programTileBackgroundColor,
    programTileTextColor,
    programTileLinkUrl,
    programTileVisible,
    playerVoteOptionTextColor,
    playerVoteProgressBarColor,
    visibleResultTiles,
    onSelectQuestion,
  } = props;

  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        /** Как у карточек результатов: 2 колонки на xs/sm и 3 на md+ */
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
        },
        justifyContent: "stretch",
        gap: 1,
        mb: 2,
        mt: 1,
        alignItems: "start",
      }}
    >
      {tileOrder.map((tileId) => {
        if (tileId === SPEAKER_TILE_ID) {
          if (!speakerEnabled || !speakerTileVisible) return null;
          return (
            <Box
              key={SPEAKER_TILE_ID}
              component="button"
              type="button"
              onClick={onSpeakerOpen}
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                height: "auto",
                justifySelf: "stretch",
                position: "relative",
                border: "none",
                borderRadius: 2,
                px: 2.5,
                py: 2,
                cursor: "pointer",
                textAlign: "left",
                whiteSpace: "pre-line",
                backgroundColor: speakerTileBackgroundColor || brandPrimaryColor,
                color: speakerTileTextColor || "#fff",
                boxShadow: 3,
                transition: "background-color 120ms ease",
                "&:hover": {
                  backgroundColor: alpha(speakerTileBackgroundColor, 0.88),
                },
              }}
            >
              <QuestionAnswerIcon
                sx={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  width: 20,
                  height: 20,
                  p: 1,
                  borderRadius: "50%",
                  bgcolor: "transparent",
                  border: `1px solid ${speakerTileTextColor || "#fff"}`,
                  color: speakerTileTextColor || "#fff",
                  boxSizing: "content-box",
                }}
                aria-hidden
              />
              <Typography
                component="span"
                sx={{
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "clamp(1.3rem, 4.2vw, 2.5rem)",
                  lineHeight: 1.35,
                }}
              >
                {speakerTileText}
              </Typography>
            </Box>
          );
        }
        if (tileId === PROGRAM_TILE_ID) {
          const safeProgramTileLinkUrl = sanitizeExternalHttpUrl(programTileLinkUrl);
          if (!programTileVisible || !safeProgramTileLinkUrl) return null;
          return (
            <Box
              key={PROGRAM_TILE_ID}
              component="a"
              href={safeProgramTileLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                width: "100%",
                height: "auto",
                justifySelf: "stretch",
                position: "relative",
                border: "none",
                borderRadius: 2,
                px: 2.5,
                py: 2,
                cursor: "pointer",
                textAlign: "left",
                whiteSpace: "pre-line",
                backgroundColor: programTileBackgroundColor || brandPrimaryColor,
                color: programTileTextColor || "#fff",
                boxShadow: 3,
                textDecoration: "none",
                transition: "background-color 120ms ease",
                "&:hover": {
                  backgroundColor: alpha(programTileBackgroundColor || brandPrimaryColor, 0.88),
                },
              }}
            >
              <EventNoteIcon
                sx={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  width: 20,
                  height: 20,
                  p: 1,
                  borderRadius: "50%",
                  bgcolor: "transparent",
                  border: `1px solid ${programTileTextColor || "#fff"}`,
                  color: programTileTextColor || "#fff",
                  boxSizing: "content-box",
                }}
                aria-hidden
              />
              <Typography
                component="span"
                sx={{
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "clamp(1.3rem, 4.2vw, 2.5rem)",
                  lineHeight: 1.35,
                }}
              >
                {programTileText}
              </Typography>
            </Box>
          );
        }
        const banner = visibleBannerById.get(tileId);
        if (!banner) return null;
        const safeBannerLinkUrl = sanitizeExternalHttpUrl(banner.linkUrl);
        const safeBannerBackgroundUrl = sanitizeClientAssetUrl(banner.backgroundUrl);
        if (!safeBannerLinkUrl || !safeBannerBackgroundUrl) return null;
        return (
          <Box
            key={banner.id}
            component="a"
            href={safeBannerLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              gridColumn:
                banner.size === "1x1" ? "span 1" : banner.size === "full" ? "1 / -1" : "span 2",
              display: "block",
              width: "100%",
              justifySelf: "stretch",
              minWidth: 0,
              aspectRatio:
                banner.size === "1x1" ? "1 / 1" : banner.size === "full" ? "4 / 1" : "2 / 1",
              borderRadius: 2,
              overflow: "hidden",
              textDecoration: "none",
            }}
          >
            <Box
              component="img"
              src={resolveClientAssetUrl(safeBannerBackgroundUrl)}
              alt=""
              aria-hidden
              sx={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
          </Box>
        );
      })}
      {visibleResultTiles.map((tile) => {
        const total = tile.optionStats.reduce((sum, row) => sum + row.count, 0);
        return (
          <Card
            key={`player-result-${tile.questionId}`}
            variant="outlined"
            component="button"
            type="button"
            onClick={() => onSelectQuestion(tile.questionId)}
            sx={{
              gridColumn: "span 1",
              width: "100%",
              aspectRatio: "1 / 1",
              textAlign: "left",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(0,0,0,0.22)",
              backdropFilter: "blur(3px)",
              p: { xs: 1.75, sm: 2 },
              cursor: "pointer",
              overflow: "hidden",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: { xs: 42, sm: 50 },
                background:
                  "linear-gradient(to bottom, rgba(8,12,24,0) 0%, rgba(8,12,24,0.85) 62%, rgba(8,12,24,0.98) 100%)",
                pointerEvents: "none",
                zIndex: 2,
              },
            }}
          >
            <CardContent
              sx={{
                p: 0,
                "&:last-child": { pb: 0 },
                position: "relative",
                zIndex: 1,
              }}
            >
              <Stack spacing={{ xs: 1.2, sm: 1.35 }} sx={{ height: "100%" }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={tile.text}
                >
                  {tile.text}
                </Typography>
                <Stack spacing={{ xs: 0.95, sm: 1.1 }} sx={{ mt: 0.85 }}>
                  {tile.optionStats.slice(0, 3).map((row) => {
                    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                    return (
                      <Box key={`${tile.questionId}_${row.optionId}`} sx={{ p: 0 }}>
                        <Box sx={{ position: "relative", borderRadius: "5px", overflow: "hidden" }}>
                          <LinearProgress
                            color="primary"
                            variant="determinate"
                            value={pct}
                            sx={{
                              position: "absolute",
                              inset: 0,
                              height: "100%",
                              bgcolor: alpha(playerVoteProgressBarColor, 0.35),
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: playerVoteProgressBarColor,
                              },
                            }}
                          />
                          <Typography
                            variant="caption"
                            component="div"
                            title={row.text}
                            sx={{
                              position: "relative",
                              color: playerVoteOptionTextColor,
                              fontWeight: 400,
                              fontSize: { xs: "0.9rem", sm: "0.98rem" },
                              pointerEvents: "none",
                              px: { xs: 1.75, sm: 2 },
                              py: { xs: 0.95, sm: 1.1 },
                              maxWidth: "100%",
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: "-webkit-box",
                                lineHeight: 1.15,
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                maxHeight: "2.3em",
                              }}
                            >
                              {row.text}
                            </Box>
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

type ConnectionChipState = {
  label: string;
  color: "success" | "warning" | "error";
  variant: "filled" | "outlined";
};

type PlayerIdentityBarProps = {
  nickname: string;
  connectionChip: ConnectionChipState;
  onNicknameClick: () => void;
};

export function PlayerIdentityBar(props: PlayerIdentityBarProps) {
  const { nickname, connectionChip, onNicknameClick } = props;
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip
            size="small"
            icon={<PersonOutlineIcon />}
            label={nickname.trim() || "без ника"}
            variant="outlined"
            onClick={onNicknameClick}
            sx={{
              alignItems: "center",
              cursor: "pointer",
              "& .MuiChip-label": {
                display: "flex",
                alignItems: "center",
                height: "100%",
                fontWeight: 600,
              },
            }}
          />
          <Tooltip title="Изменить имя">
            <IconButton size="small" aria-label="Изменить имя" onClick={onNicknameClick}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <Chip
          size="small"
          label={connectionChip.label}
          color={connectionChip.color}
          variant={connectionChip.variant}
          sx={{
            alignItems: "center",
            "& .MuiChip-label": {
              display: "flex",
              alignItems: "center",
              height: "100%",
            },
          }}
        />
      </Stack>
    </Box>
  );
}

type ReactionMetaItem = {
  type: ReactionType;
  emoji: string;
};

type ReactionsDockProps = {
  reactions: ReactionMetaItem[];
  onToggleReaction: (type: ReactionType) => void;
  brandPrimaryColor: string;
};

type ReactionBurst = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  driftX: number;
  size: number;
  durationMs: number;
};

export function ReactionsDock(props: ReactionsDockProps) {
  const { reactions, onToggleReaction, brandPrimaryColor } = props;
  const [bursts, setBursts] = useState<ReactionBurst[]>([]);

  const spawnBurstsFromButton = (emoji: string, target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    const rect = target.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height * 0.45;
    const next: ReactionBurst[] = Array.from({ length: 3 }, (_, i) => ({
      id: `${Date.now()}_${emoji}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      emoji,
      x: startX,
      y: startY,
      driftX: (Math.random() - 0.5) * 42,
      size: 24 + Math.round(Math.random() * 8),
      durationMs: 760 + Math.round(Math.random() * 320),
    }));
    setBursts((prev) => [...prev, ...next]);
  };

  const removeBurst = (id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1450,
        px: { xs: 1.25, sm: 2 },
        pb: { xs: 1.25, sm: 2 },
      }}
    >
      {bursts.map((burst) => (
        <Box
          key={burst.id}
          onAnimationEnd={() => removeBurst(burst.id)}
          sx={{
            position: "fixed",
            left: burst.x,
            top: burst.y,
            zIndex: 1500,
            pointerEvents: "none",
            fontSize: `${burst.size}px`,
            lineHeight: 1,
            transform: "translate(-50%, -50%)",
            animation:
              "mqReactionBurstUp var(--mq-burst-duration) cubic-bezier(0.22, 0.9, 0.22, 1) forwards",
            "--mq-burst-drift-x": `${burst.driftX}px`,
            "--mq-burst-duration": `${burst.durationMs}ms`,
            "@keyframes mqReactionBurstUp": {
              "0%": {
                opacity: 0,
                transform: "translate(-50%, -50%) scale(0.75)",
              },
              "18%": {
                opacity: 1,
                transform: "translate(-50%, -64%) scale(1)",
              },
              "100%": {
                opacity: 0,
                transform: "translate(calc(-50% + var(--mq-burst-drift-x)), -360%) scale(0.92)",
              },
            },
          }}
        >
          {burst.emoji}
        </Box>
      ))}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ overflowX: "visible", pb: 0.25 }}
      >
        {reactions.map((item) => (
          <Button
            key={item.type}
            variant="outlined"
            color="primary"
            size="large"
            onClick={(event) => {
              onToggleReaction(item.type);
              spawnBurstsFromButton(item.emoji, event.currentTarget);
            }}
            sx={{
              bgcolor: "rgba(0, 0, 0, 0.52)",
              borderWidth: 2,
              borderColor: brandPrimaryColor,
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.62)",
                borderWidth: 2,
                borderColor: brandPrimaryColor,
              },
              textTransform: "none",
              width: { xs: 76, sm: 86 },
              minWidth: { xs: 76, sm: 86 },
              height: { xs: 76, sm: 86 },
              minHeight: { xs: 76, sm: 86 },
              p: 0,
              fontWeight: 700,
              borderRadius: 1.5,
            }}
          >
            <Box component="span" sx={{ fontSize: { xs: "1.8rem", sm: "2rem" }, lineHeight: 1 }}>
              {item.emoji}
            </Box>
          </Button>
        ))}
      </Stack>
    </Box>
  );
}

type JoinCardProps = {
  nickname: string;
  nicknameInputRef: RefObject<HTMLInputElement | null>;
  onNicknameChange: (value: string) => void;
  onRandomNickname: () => void;
  onJoin: () => void;
};

export function JoinCard(props: JoinCardProps) {
  const { nickname, nicknameInputRef, onNicknameChange, onRandomNickname, onJoin } = props;
  return (
    <Card
      variant="outlined"
      sx={{
        mt: { xs: 2, md: "auto" },
        mb: {
          xs: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
          md: 5,
        },
        width: "100%",
        maxWidth: 520,
        mx: "auto",
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <OutlinedInput
              autoFocus
              inputRef={nicknameInputRef}
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder="Введите имя или используйте случайное"
              fullWidth
              sx={{ minHeight: 56 }}
            />
            <Button
              variant="outlined"
              onClick={onRandomNickname}
              sx={{
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.5)",
                minHeight: 56,
                px: 4,
                mx: { xs: 0, sm: 1 },
                minWidth: { sm: 180 },
                whiteSpace: "nowrap",
              }}
            >
              Случайное имя
            </Button>
          </Stack>
          <Button variant="contained" onClick={onJoin}>
            Войти
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RestoreJoinPendingBlock() {
  return (
    <Box
      sx={{
        mt: { xs: 2, md: "auto" },
        mb: {
          xs: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
          md: 5,
        },
        width: "100%",
        minHeight: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress size={42} />
    </Box>
  );
}

type CompletionOverlayProps = {
  brandPrimaryColor: string;
  message: string;
  onClose: () => void;
  compact?: boolean;
};

export function CompletionOverlay(props: CompletionOverlayProps) {
  const { brandPrimaryColor, message, onClose, compact = false } = props;
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1.5, sm: 2.5 },
        backgroundColor: "rgba(0, 0, 0, 0.42)",
      }}
    >
      <Card
        variant="outlined"
        sx={{ width: "100%", maxWidth: 980, maxHeight: "92vh", overflowY: "auto" }}
      >
        <CardContent sx={{ position: "relative" }}>
          <IconButton
            aria-label="Закрыть"
            size="small"
            onClick={onClose}
            sx={{ position: "absolute", top: 8, right: 8, color: brandPrimaryColor }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Stack alignItems="center" spacing={2} sx={{ textAlign: "center", py: compact ? 1 : 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 64, color: brandPrimaryColor }} aria-hidden />
            <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
              Квиз завершён
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {message}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

type QuestionPopupCardProps = {
  brandPrimaryColor: string;
  question: ActiveQuestion;
  quizProgress: QuizState["quizProgress"];
  displayedSelected: string[];
  answeredCurrentQuestion: boolean;
  showAcceptedHint?: boolean;
  submittedAnswers: Record<string, string[]>;
  rankOrder: string[];
  rankRowRefs: RefObject<Map<string, HTMLDivElement>>;
  moveRankOption: (optionId: string, direction: -1 | 1) => void;
  toggleOption: (id: string) => void;
  closeQuestionPopup: () => void;
  tagAnswers: string[];
  setTagAnswers: Dispatch<SetStateAction<string[]>>;
  canSubmit: boolean;
  submit: () => void;
  ruBallLabel: (n: number) => string;
};

export function QuestionPopupCard(props: QuestionPopupCardProps) {
  const {
    brandPrimaryColor,
    question,
    quizProgress,
    displayedSelected,
    answeredCurrentQuestion,
    showAcceptedHint = false,
    submittedAnswers,
    rankOrder,
    rankRowRefs,
    moveRankOption,
    toggleOption,
    closeQuestionPopup,
    tagAnswers,
    setTagAnswers,
    canSubmit,
    submit,
    ruBallLabel,
  } = props;
  const rankingHintRaw = question.rankingPlayerHint?.trim() ?? "";
  const rankingHint =
    rankingHintRaw ===
    "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется."
      ? "Расставьте варианты от лучшего к худшему."
      : rankingHintRaw;
  const questionLength = question.text.trim().length;
  const longTextPenalty = Math.min(1.25, Math.max(0, (questionLength - 72) / 170));
  const desktopQuestionFontRem = Math.max(1.6, 2.25 - longTextPenalty);
  const mobileQuestionFontRem = Math.max(1.05, desktopQuestionFontRem - 0.35);
  const metaChipSx = {
    height: 24,
    color: "#fff",
    bgcolor: "transparent",
    border: "none",
    borderRadius: 0,
    borderBottom: `2px solid ${brandPrimaryColor}`,
    "& .MuiChip-label": { px: 1, fontSize: "0.72rem", fontWeight: 600 },
  } as const;
  const optionButtonSx = (isSelected: boolean) => ({
    ...(isSelected
      ? {
          bgcolor: brandPrimaryColor,
          "&:hover": { bgcolor: alpha(brandPrimaryColor, 0.88) },
        }
      : {}),
    transition: "transform 180ms ease, box-shadow 220ms ease, background-color 180ms ease",
    transform: isSelected ? "scale(1.03)" : "scale(1)",
    boxShadow: isSelected ? `0 0 0 2px ${alpha(brandPrimaryColor, 0.42)}` : "none",
    "& .MuiButton-startIcon": {
      transformOrigin: "center",
      animation: isSelected ? "mqCheckIn 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
    },
    "@keyframes mqCheckIn": {
      "0%": { transform: "scale(0.7)", opacity: 0 },
      "55%": { transform: "scale(1.04)", opacity: 1 },
      "100%": { transform: "scale(1)", opacity: 1 },
    },
  });

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1.5, sm: 2.5 },
        backgroundColor: "rgba(0, 0, 0, 0.42)",
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 980,
          maxHeight: "92vh",
          overflowY: "auto",
          bgcolor: "rgba(38, 38, 38, 0.84)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ bgcolor: "transparent", color: "inherit" }}>
          <Stack spacing={2}>
            {showAcceptedHint ? <Alert severity="success">Ответ принят</Alert> : null}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                {quizProgress && quizProgress.total > 0 ? (
                  <Chip
                    label={`Вопрос ${quizProgress.index} / ${quizProgress.total}`}
                    size="small"
                    sx={metaChipSx}
                  />
                ) : null}
                <Chip label={getQuestionTypeLabel(question)} size="small" sx={metaChipSx} />
              </Stack>
              <IconButton
                aria-label="Закрыть"
                size="small"
                onClick={closeQuestionPopup}
                sx={{ color: "#fff" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
                fontSize: {
                  xs: `${mobileQuestionFontRem}rem`,
                  sm: `${desktopQuestionFontRem}rem`,
                },
                py: 1,
              }}
            >
              {question.text}
            </Typography>
            {question.type !== "tag_cloud" && question.type !== "ranking" && (
              <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ pb: 2 }}>
                {question.options.map((option) => {
                  const isSelected = displayedSelected.includes(option.id);
                  return (
                    <Button
                      key={option.id}
                      variant={isSelected ? "contained" : "outlined"}
                      color={isSelected ? "primary" : "inherit"}
                      sx={optionButtonSx(isSelected)}
                      disabled={answeredCurrentQuestion}
                      onClick={() => toggleOption(option.id)}
                      startIcon={isSelected ? <CheckCircleIcon /> : undefined}
                    >
                      {option.text}
                    </Button>
                  );
                })}
              </Stack>
            )}
            {question.type === "ranking" && (
              <Stack spacing={1.25} sx={{ pb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {rankingHint ||
                    (question.rankingKind === "jury"
                      ? "Расставьте варианты от лучшего к худшему."
                      : "Расставьте варианты от лучшего к худшему (первый в списке — лучший).")}
                </Typography>
                {(answeredCurrentQuestion ? (submittedAnswers[question.id] ?? []) : rankOrder).map(
                  (id, idx) => {
                    const option = question.options.find((o) => o.id === id);
                    if (!option) return null;
                    const tierPts =
                      question.rankingKind === "jury"
                        ? question.rankingPointsByRank?.[idx]
                        : undefined;
                    return (
                      <Stack
                        key={id}
                        ref={(node) => {
                          if (node) rankRowRefs.current.set(id, node);
                          else rankRowRefs.current.delete(id);
                        }}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: "100%" }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ width: 28, flexShrink: 0, fontWeight: 700 }}
                        >
                          {idx + 1}.
                        </Typography>
                        <Box
                          sx={(theme) => ({
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            borderRadius: 1,
                            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                            bgcolor:
                              theme.palette.mode === "dark"
                                ? alpha(theme.palette.common.white, 0.06)
                                : alpha(theme.palette.common.black, 0.04),
                            px: 1.5,
                            py: 1.25,
                          })}
                        >
                          <Typography
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              typography: "body2",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: 0.02,
                              color: "text.secondary",
                            }}
                          >
                            {option.text}
                          </Typography>
                          {tierPts != null && (
                            <Typography
                              variant="caption"
                              sx={{
                                flexShrink: 0,
                                fontWeight: 700,
                                color: "text.secondary",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ruBallLabel(tierPts)}
                            </Typography>
                          )}
                        </Box>
                        {!answeredCurrentQuestion && (
                          <>
                            <IconButton
                              aria-label="Выше"
                              size="small"
                              disabled={idx === 0}
                              onClick={() => moveRankOption(id, -1)}
                            >
                              <KeyboardArrowUpIcon />
                            </IconButton>
                            <IconButton
                              aria-label="Ниже"
                              size="small"
                              disabled={idx >= rankOrder.length - 1}
                              onClick={() => moveRankOption(id, 1)}
                            >
                              <KeyboardArrowDownIcon />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    );
                  },
                )}
              </Stack>
            )}
            {question.type === "tag_cloud" && (
              <Stack spacing={1.5} sx={{ pb: 2 }}>
                {(answeredCurrentQuestion ? (submittedAnswers[question.id] ?? []) : tagAnswers).map(
                  (value, index) => (
                    <Stack
                      key={`tag-answer-${index}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <TextField
                        value={value}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          const limit = question.maxAnswers ?? 5;
                          setTagAnswers((prev) => {
                            const next = prev.map((item, i) => (i === index ? nextValue : item));
                            const isLastField = index === next.length - 1;
                            if (isLastField && nextValue.trim() && next.length < limit) {
                              next.push("");
                            }
                            return next;
                          });
                        }}
                        placeholder={`Ответ ${index + 1}`}
                        size="small"
                        disabled={answeredCurrentQuestion}
                        multiline
                        minRows={1}
                        maxRows={3}
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": {
                            color: "#fff",
                            "& fieldset": {
                              borderColor: "rgba(255,255,255,0.35)",
                            },
                            "&:hover fieldset": {
                              borderColor: "rgba(255,255,255,0.55)",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: brandPrimaryColor,
                              borderWidth: 2,
                            },
                          },
                        }}
                      />
                      {!answeredCurrentQuestion && index > 0 && (
                        <IconButton
                          aria-label="Удалить ответ"
                          color="inherit"
                          onClick={() =>
                            setTagAnswers((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Stack>
                  ),
                )}
              </Stack>
            )}
          </Stack>
          <Box sx={{ pt: 1 }}>
            {!answeredCurrentQuestion ? (
              <Button
                disabled={!canSubmit}
                onClick={submit}
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  minHeight: 52,
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  bgcolor: brandPrimaryColor,
                  "&:hover": { bgcolor: alpha(brandPrimaryColor, 0.88) },
                }}
              >
                Отправить ответ
              </Button>
            ) : (
              <Alert severity="success">Ответ принят</Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
