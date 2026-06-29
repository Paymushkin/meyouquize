/** Общий вид модалок игрока (вопросы спикерам, отчёт по квизу). */
import type { MenuProps } from "@mui/material/Menu";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { buildJoinNicknameInputSx } from "../../pages/quiz-play/QuizPlayBrandingBlocks";

export const PLAYER_DIALOG_PAPER_SX = {
  bgcolor: "rgba(0, 0, 0, 0.9)",
  color: "#fff",
  backdropFilter: "blur(4px)",
} as const;

/** Фиксированный оверлей попапа голосования/обратной связи — скролл на всём слое, не на flex-ребёнке. */
export const PLAYER_POPUP_OVERLAY_SX = {
  position: "fixed",
  inset: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehaviorY: "contain",
  p: { xs: 1.5, sm: 2.5 },
  backgroundColor: "rgba(0, 0, 0, 0.85)",
} as const;

export const PLAYER_POPUP_ALIGN_SX = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100%",
  boxSizing: "border-box",
} as const;

export const PLAYER_POPUP_CARD_SX = {
  width: "100%",
  maxWidth: 678,
  flexShrink: 0,
  margin: "auto",
  bgcolor: "rgba(38, 38, 38, 0.84)",
  backdropFilter: "blur(4px)",
  color: "#fff",
  boxShadow: "none",
} as const;

export const PLAYER_DIALOG_TITLE_SX = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  pr: 0.5,
  pb: 1,
  color: "#fff",
} as const;

export const PLAYER_DIALOG_CONTENT_SX = {
  pt: 2,
  pb: 1.5,
  color: "#fff",
  overflow: "visible",
  "&.MuiDialogContent-root": {
    overflow: "visible",
  },
} as const;

export function buildPlayerDialogFieldLabelSx(
  inputTextColor: string,
  brandFontFamily: string,
): SxProps<Theme> {
  return {
    fontFamily: brandFontFamily,
    fontStyle: "normal",
    color: alpha(inputTextColor, 0.72),
    fontSize: "0.875rem",
    lineHeight: 1.35,
    display: "block",
  };
}

export const PLAYER_DIALOG_SECONDARY_TEXT = {
  color: "rgba(255, 255, 255, 0.65)",
} as const;

function buildPlayerDialogFontSx(brandFontFamily: string): SxProps<Theme> {
  return {
    fontFamily: brandFontFamily,
    fontStyle: "normal",
    "& .MuiInputBase-input": {
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
  };
}

/** PaperProps.sx для модалок вне Container — наследуют брендовый шрифт. */
export function buildPlayerDialogPaperSx(brandFontFamily: string): SxProps<Theme> {
  return {
    ...PLAYER_DIALOG_PAPER_SX,
    ...buildPlayerDialogFontSx(brandFontFamily),
    "&, & *": {
      fontStyle: "normal",
    },
    "& .MuiTypography-root, & .MuiButton-root, & .MuiTab-root, & .MuiInputBase-root, & .MuiFormLabel-root":
      {
        fontFamily: brandFontFamily,
        fontStyle: "normal",
      },
  };
}

export function buildPlayerDialogTextFieldSx(
  focusColor: string,
  inputTextColor: string,
  brandFontFamily: string,
): SxProps<Theme> {
  const focusedOutlineSx = {
    borderColor: focusColor,
    borderWidth: 2,
  };

  return {
    ...buildJoinNicknameInputSx(focusColor, inputTextColor, brandFontFamily),
    minHeight: "unset",
    "& .MuiOutlinedInput-root": {
      minHeight: "unset",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(inputTextColor, 0.45),
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(inputTextColor, 0.72),
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": focusedOutlineSx,
      "&.Mui-focused fieldset": focusedOutlineSx,
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": focusedOutlineSx,
    "& .MuiOutlinedInput-root.Mui-focused fieldset": focusedOutlineSx,
    "& .MuiSelect-icon": {
      color: alpha(inputTextColor, 0.72),
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiSelect-icon": {
      color: focusColor,
    },
  } satisfies SxProps<Theme>;
}

export function buildPlayerDialogSelectMenuProps(
  brandFontFamily: string,
  brandColor: string,
  selectedItemTextColor: string,
): Partial<MenuProps> {
  return {
    PaperProps: {
      sx: {
        bgcolor: "rgba(38, 38, 38, 0.96)",
        color: "#fff",
        fontFamily: brandFontFamily,
        "& .MuiMenuItem-root": {
          fontFamily: brandFontFamily,
          fontStyle: "normal",
          color: "#fff",
          transition: "background-color 160ms ease, color 160ms ease",
          "&:hover": {
            bgcolor: alpha(brandColor, 0.18),
            color: brandColor,
          },
          "&.Mui-focusVisible": {
            bgcolor: alpha(brandColor, 0.18),
            color: brandColor,
          },
          "&.Mui-selected": {
            bgcolor: brandColor,
            color: selectedItemTextColor,
            fontWeight: 600,
            "&:hover": {
              bgcolor: alpha(brandColor, 0.88),
              color: selectedItemTextColor,
            },
            "&.Mui-focusVisible": {
              bgcolor: alpha(brandColor, 0.88),
              color: selectedItemTextColor,
            },
          },
        },
      },
    },
  };
}

export function buildPlayerDialogTabsSx(
  brandColor: string,
  brandFontFamily?: string,
): SxProps<Theme> {
  return {
    minHeight: 36,
    borderBottom: `1px solid ${alpha("#fff", 0.12)}`,
    "& .MuiTabs-indicator": {
      backgroundColor: brandColor,
      height: 2,
    },
    "& .MuiTab-root": {
      minHeight: 36,
      py: 0.5,
      px: 0,
      fontSize: "0.875rem",
      textTransform: "none",
      textAlign: "left",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      ...(brandFontFamily
        ? {
            fontFamily: brandFontFamily,
            fontStyle: "normal",
          }
        : {}),
      color: alpha("#fff", 0.55),
      transition: "color 160ms ease",
      "&.Mui-selected": {
        color: brandColor,
        fontWeight: 600,
      },
      "&:hover": {
        color: alpha(brandColor, 0.85),
      },
    },
  };
}
