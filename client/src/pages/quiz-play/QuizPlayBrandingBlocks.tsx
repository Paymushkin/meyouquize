/* eslint-disable react-refresh/only-export-components */
import {
  PHOTO_WALL_TILE_ID,
  PROGRAM_TILE_ID,
  SPEAKER_TILE_ID,
  ruBallLabel,
} from "@meyouquize/shared";
import { isQuizResultsTileId } from "../../publicViewContract";
import { PlayerPhotoWallCollageTile } from "../../components/quiz/PlayerPhotoWallCollageTile";
import { PlayerQuizResultsTile } from "../../components/quiz/PlayerQuizResultsTile";
import type { PlayerQuizResultsTileModel } from "../../features/quizPlay/playerQuizResults";
import {
  playerEventTitleSx,
  playerFullWidthTileLabelSx,
} from "../../features/voteUi/voteQuestionLayout";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventNoteIcon from "@mui/icons-material/EventNote";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
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
  OutlinedInput,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { useState, type RefObject } from "react";
import type { QuizState, ReactionType } from "./types";
import { PlayerVisibleResultTileCard } from "../../components/quiz/PlayerVisibleResultTileCard";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";
import {
  sanitizeBannerLinkUrl,
  sanitizeClientAssetUrl,
  sanitizeExternalHttpUrl,
} from "../../utils/safeUrls";

type BannerTile = {
  id: string;
  linkUrl: string;
  backgroundUrl: string;
  size: "2x1" | "1x1" | "full";
};

type QuizPlayContainerSxParams = {
  brandFontFamily: string;
  isJoinScreen?: boolean;
  joined?: boolean;
};

export function buildQuizPlayContainerSx(params: QuizPlayContainerSxParams): SxProps<Theme> {
  const { brandFontFamily, isJoinScreen = false, joined = false } = params;
  const allowMainScroll = joined && !isJoinScreen;
  return {
    position: "relative",
    zIndex: 1,
    bgcolor: "transparent",
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
    pt: isJoinScreen ? { xs: 5, sm: 6 } : 2,
    maxWidth: "678px !important",
    pb: isJoinScreen
      ? "env(safe-area-inset-bottom, 0px)"
      : {
          xs: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
          sm: 4,
        },
    minHeight: "100dvh",
    height: allowMainScroll ? "auto" : "100dvh",
    overflowY: allowMainScroll ? "auto" : "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: isJoinScreen ? "center" : "stretch",
  };
}

type EventTitleBlockProps = {
  joined: boolean;
  isJoinScreen?: boolean;
  shouldShowEventTitle: boolean;
  joinPending: boolean;
  hasActiveQuestion: boolean;
  brandLogoUrl: string;
  brandFontFamily: string;
  titleText: string;
};

export function EventTitleBlock(props: EventTitleBlockProps) {
  const {
    joined,
    isJoinScreen = false,
    shouldShowEventTitle,
    joinPending,
    hasActiveQuestion,
    brandLogoUrl,
    brandFontFamily,
    titleText,
  } = props;
  const safeBrandLogoUrl = sanitizeClientAssetUrl(brandLogoUrl);
  const normalizedTitleText = titleText.trim();
  const showTitle = shouldShowEventTitle && normalizedTitleText.length > 0;
  if (
    (!joined && joinPending) ||
    (joined && !shouldShowEventTitle) ||
    (!joined && !shouldShowEventTitle && !isJoinScreen) ||
    (!safeBrandLogoUrl && !showTitle)
  ) {
    return null;
  }
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: isJoinScreen ? "flex-start" : "center",
        justifyContent: isJoinScreen ? "flex-start" : "center",
        minHeight: joined ? 0 : 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        flexShrink: 0,
        ...(isJoinScreen
          ? {
              px: { xs: 2, sm: 0 },
              mt: { xs: 1, sm: 1.5 },
              alignSelf: "stretch",
            }
          : {}),
        ...(hasActiveQuestion ? { minHeight: 0, mb: 2 } : {}),
        ...(joined ? { mb: 4 } : {}),
      }}
    >
      <Stack
        spacing={isJoinScreen ? 1.5 : 1}
        alignItems={isJoinScreen ? "flex-start" : "center"}
        sx={{ width: "100%" }}
      >
        {safeBrandLogoUrl ? (
          <Box
            component="img"
            src={resolveClientAssetUrl(safeBrandLogoUrl)}
            alt="Логотип"
            sx={{
              alignSelf: "flex-start",
              mb: isJoinScreen ? 0.5 : 1.5,
              maxHeight: 56,
              maxWidth: isJoinScreen ? "min(56vw, 220px)" : "min(60vw, 280px)",
              objectFit: "contain",
            }}
          />
        ) : null}
        {showTitle ? (
          <Typography
            variant="h3"
            gutterBottom={!isJoinScreen}
            align="left"
            sx={
              isJoinScreen
                ? {
                    ...playerEventTitleSx(brandFontFamily),
                    fontSize: "clamp(1.75rem, 6vw, 3rem)",
                    lineHeight: 1.08,
                    letterSpacing: 0.4,
                    mb: 0,
                  }
                : playerEventTitleSx(brandFontFamily)
            }
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
  photoWallTileVisible: boolean;
  photoWallCollageSrcs: string[];
  onOpenPhotoWall: () => void;
  playerQuizResultsTilesBySubQuizId: Map<string, PlayerQuizResultsTileModel>;
  onOpenQuizReport: (subQuizId: string) => void;
  playerVoteOptionTextColor: string;
  playerVoteProgressBarColor: string;
  visibleResultTiles: NonNullable<QuizState["playerVisibleResults"]>;
  onSelectQuestion: (questionId: string) => void;
  onBannerClick: (bannerId: string) => void;
};

export function PlayerTilesGrid(props: PlayerTilesGridProps) {
  const {
    tileOrder,
    visibleBannerById,
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
    photoWallTileVisible,
    photoWallCollageSrcs,
    onOpenPhotoWall,
    playerQuizResultsTilesBySubQuizId,
    onOpenQuizReport,
    playerVoteOptionTextColor,
    playerVoteProgressBarColor,
    visibleResultTiles,
    onSelectQuestion,
    onBannerClick,
  } = props;

  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        /** 2 колонки до 600px, 3 колонки от sm (600px) */
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
        },
        justifyContent: "stretch",
        gap: { xs: 1.5, sm: 2 },
        mb: 2,
        mt: 1.5,
        alignItems: "start",
      }}
    >
      {tileOrder.map((tileId) => {
        if (tileId === SPEAKER_TILE_ID) {
          if (!speakerTileVisible) return null;
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
              <Typography component="span" sx={playerFullWidthTileLabelSx}>
                {speakerTileText}
              </Typography>
            </Box>
          );
        }
        if (tileId === PHOTO_WALL_TILE_ID) {
          if (!photoWallTileVisible || photoWallCollageSrcs.length === 0) return null;
          return (
            <PlayerPhotoWallCollageTile
              key={PHOTO_WALL_TILE_ID}
              photoSrcs={photoWallCollageSrcs}
              onClick={onOpenPhotoWall}
            />
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
              <Typography component="span" sx={playerFullWidthTileLabelSx}>
                {programTileText}
              </Typography>
            </Box>
          );
        }
        if (isQuizResultsTileId(tileId)) {
          const reportTile = playerQuizResultsTilesBySubQuizId.get(tileId);
          if (!reportTile) return null;
          return (
            <PlayerQuizResultsTile
              key={tileId}
              title={reportTile.title}
              score={reportTile.score}
              brandPrimaryColor={brandPrimaryColor}
              textColor={playerVoteOptionTextColor || "#000"}
              onClick={() => onOpenQuizReport(reportTile.subQuizId)}
            />
          );
        }
        const banner = visibleBannerById.get(tileId);
        if (!banner) return null;
        const safeBannerLinkUrl = sanitizeBannerLinkUrl(banner.linkUrl);
        const safeBannerBackgroundUrl = sanitizeClientAssetUrl(banner.backgroundUrl);
        if (!safeBannerLinkUrl || !safeBannerBackgroundUrl) return null;
        const bannerOpensMail = safeBannerLinkUrl.startsWith("mailto:");
        return (
          <Box
            key={banner.id}
            component="a"
            href={safeBannerLinkUrl}
            {...(bannerOpensMail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            onClick={() => onBannerClick(banner.id)}
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
      {visibleResultTiles.map((tile) => (
        <PlayerVisibleResultTileCard
          key={`player-result-${tile.questionId}`}
          tile={tile}
          playerVoteOptionTextColor={playerVoteOptionTextColor}
          playerVoteProgressBarColor={playerVoteProgressBarColor}
          onSelect={() => onSelectQuestion(tile.questionId)}
        />
      ))}
    </Box>
  );
}

type ConnectionChipState =
  | { label: string; variant: "filled"; accentFill: true }
  | { label: string; color: "warning" | "error"; variant: "filled" | "outlined" };

const PLAYER_BAR_ROOT_SX: SxProps<Theme> = { mb: 3 };

const NICKNAME_CHIP_SX: SxProps<Theme> = {
  alignItems: "center",
  cursor: "pointer",
  color: "#111",
  borderColor: "rgba(0,0,0,0.35)",
  bgcolor: "rgba(255,255,255,0.92)",
  "&:hover, &.MuiChip-clickable:hover, &.MuiChip-clickableColorDefault:hover": {
    bgcolor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(0,0,0,0.35)",
  },
  "& .MuiChip-icon": {
    color: "rgba(0,0,0,0.72)",
  },
  "& .MuiChip-label": {
    display: "flex",
    alignItems: "center",
    height: "100%",
    fontWeight: 400,
    color: "#111",
  },
};

function buildConnectionChipSx(
  connectionChip: ConnectionChipState,
  accentBackgroundColor: string,
  accentTextColor: string,
): SxProps<Theme> {
  const accentFill = "accentFill" in connectionChip;
  return {
    alignItems: "center",
    borderRadius: 1.25,
    fontWeight: 400,
    ...(accentFill
      ? {
          backgroundColor: accentBackgroundColor,
          color: accentTextColor,
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: `0 0 0 1px ${alpha(accentBackgroundColor, 0.45)} inset`,
        }
      : {}),
    "& .MuiChip-label": {
      display: "flex",
      alignItems: "center",
      height: "100%",
      fontWeight: 400,
      letterSpacing: 0.2,
      ...(accentFill ? { color: accentTextColor } : {}),
    },
    "& .MuiChip-icon": {
      ...(accentFill ? { color: accentTextColor } : {}),
    },
  };
}

const JOIN_CARD_ROOT_SX: SxProps<Theme> = {
  width: "100%",
  maxWidth: 520,
  mx: "auto",
  bgcolor: "transparent",
  borderColor: "transparent",
  boxShadow: "none",
};

export const JOIN_SCREEN_STACK_SX: SxProps<Theme> = {
  width: "100%",
  maxWidth: 520,
  px: { xs: 2, sm: 0 },
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 1.5,
};

export const JOIN_SCREEN_MAIN_SX: SxProps<Theme> = {
  flex: 1,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 0,
};

const JOIN_CARD_CONTENT_SX: SxProps<Theme> = {
  bgcolor: "rgba(38, 38, 38, 0.84)",
  color: "#fff",
  backdropFilter: "blur(4px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 2,
  boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
  p: 2,
  "&:last-child": { pb: 2 },
};

export function buildJoinNicknameInputSx(
  focusColor: string,
  formTextColor: string,
  brandFontFamily?: string,
): SxProps<Theme> {
  const outlineSx = {
    color: formTextColor,
    "& .MuiOutlinedInput-input": { color: formTextColor },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: alpha(formTextColor, 0.45),
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: alpha(formTextColor, 0.72),
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: focusColor,
    },
  };
  const fontSx: SxProps<Theme> = brandFontFamily
    ? {
        fontFamily: brandFontFamily,
        fontStyle: "normal",
        "& .MuiOutlinedInput-input": {
          fontFamily: brandFontFamily,
          fontStyle: "normal",
        },
        "& .MuiSelect-select": {
          fontFamily: brandFontFamily,
          fontStyle: "normal",
        },
        "& .MuiInputBase-input::placeholder": {
          fontFamily: brandFontFamily,
          fontStyle: "normal",
          opacity: 1,
        },
        "& input::placeholder, & textarea::placeholder": {
          fontFamily: brandFontFamily,
          fontStyle: "normal",
          opacity: 1,
        },
      }
    : {};
  return {
    minHeight: 56,
    ...outlineSx,
    ...fontSx,
    "& .MuiOutlinedInput-root": {
      ...outlineSx,
      ...(brandFontFamily ? { fontFamily: brandFontFamily, fontStyle: "normal" } : {}),
    },
  };
}

const RANDOM_NICKNAME_BUTTON_SX: SxProps<Theme> = {
  color: "#ffffff",
  borderColor: "rgba(255, 255, 255, 0.5)",
  minHeight: 56,
  px: 4,
  mx: { xs: 0, sm: 1 },
  minWidth: { sm: 180 },
  whiteSpace: "nowrap",
  "&:hover": {
    borderColor: "rgba(255, 255, 255, 0.75)",
  },
};

export function buildBrandPrimaryContainedButtonSx(
  backgroundColor: string,
  textColor: string,
): SxProps<Theme> {
  return {
    bgcolor: backgroundColor,
    color: textColor,
    "&:hover": { bgcolor: backgroundColor, filter: "brightness(0.94)" },
  };
}

export function buildBrandOutlinedButtonSx(textColor: string): SxProps<Theme> {
  return {
    color: textColor,
    borderColor: alpha(textColor, 0.45),
    "&:hover": {
      borderColor: alpha(textColor, 0.72),
      bgcolor: alpha(textColor, 0.08),
    },
  };
}

type PlayerIdentityBarProps = {
  nickname: string;
  formBackgroundColor: string;
  formTextColor: string;
  connectionChip: ConnectionChipState;
  onNicknameClick: () => void;
};

export function PlayerIdentityBar(props: PlayerIdentityBarProps) {
  const { nickname, formBackgroundColor, formTextColor, connectionChip, onNicknameClick } = props;
  return (
    <Box sx={PLAYER_BAR_ROOT_SX}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip
            size="small"
            label={nickname.trim() || "без ника"}
            variant="outlined"
            onClick={onNicknameClick}
            sx={NICKNAME_CHIP_SX}
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
          {...("accentFill" in connectionChip ? {} : { color: connectionChip.color })}
          variant={connectionChip.variant}
          sx={buildConnectionChipSx(connectionChip, formBackgroundColor, formTextColor)}
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
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
  brandFontFamily: string;
  nickname: string;
  nicknameError?: string;
  nicknameInputRef: RefObject<HTMLInputElement | null>;
  onNicknameChange: (value: string) => void;
  onRandomNickname: () => void;
  onJoin: () => void;
};

export function JoinCard(props: JoinCardProps) {
  const {
    formBackgroundColor,
    formTextColor,
    formInputTextColor,
    brandFontFamily,
    nickname,
    nicknameError,
    nicknameInputRef,
    onNicknameChange,
    onRandomNickname,
    onJoin,
  } = props;
  return (
    <Card variant="outlined" sx={JOIN_CARD_ROOT_SX}>
      <CardContent sx={JOIN_CARD_CONTENT_SX}>
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <OutlinedInput
                autoFocus
                inputRef={nicknameInputRef}
                value={nickname}
                onChange={(e) => onNicknameChange(e.target.value)}
                placeholder="Введите имя или используйте случайное"
                fullWidth
                error={Boolean(nicknameError)}
                sx={buildJoinNicknameInputSx(
                  formBackgroundColor,
                  formInputTextColor,
                  brandFontFamily,
                )}
              />
              <Button
                variant="outlined"
                onClick={onRandomNickname}
                sx={{
                  ...RANDOM_NICKNAME_BUTTON_SX,
                  color: formInputTextColor,
                  borderColor: alpha(formInputTextColor, 0.45),
                  "&:hover": {
                    borderColor: alpha(formInputTextColor, 0.72),
                  },
                }}
              >
                Случайное имя
              </Button>
            </Stack>
            {nicknameError ? (
              <Typography variant="body2" color="error" sx={{ px: 0.25 }}>
                {nicknameError}
              </Typography>
            ) : null}
          </Stack>
          <Button
            variant="contained"
            onClick={onJoin}
            sx={buildBrandPrimaryContainedButtonSx(formBackgroundColor, formTextColor)}
          >
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
  /** Подзаголовок под «Квиз завершён»; если пусто — блок не показывается. */
  message?: string;
  /** Доп. строка, например «Ваш результат: N баллов». */
  scoreLine?: string;
  onClose: () => void;
  compact?: boolean;
};

export function CompletionOverlay(props: CompletionOverlayProps) {
  const { brandPrimaryColor, message, scoreLine, onClose, compact = false } = props;
  const messageTrimmed = message?.trim() ?? "";
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
            {messageTrimmed ? (
              <Typography variant="body1" color="text.secondary">
                {messageTrimmed}
              </Typography>
            ) : null}
            {scoreLine ? (
              <Typography
                variant="h6"
                component="p"
                sx={{ fontWeight: 700, color: brandPrimaryColor }}
              >
                {scoreLine}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
