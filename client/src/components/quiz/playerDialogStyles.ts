/** Общий вид модалок игрока (вопросы спикерам, отчёт по квизу). */
import { alpha, type SxProps, type Theme } from "@mui/material/styles";

export const PLAYER_DIALOG_PAPER_SX = {
  bgcolor: "rgba(0, 0, 0, 0.9)",
  color: "#fff",
  backdropFilter: "blur(4px)",
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
  pt: 0.5,
  pb: 1.5,
  color: "#fff",
} as const;

export const PLAYER_DIALOG_SECONDARY_TEXT = {
  color: "rgba(255, 255, 255, 0.65)",
} as const;

export function buildPlayerDialogTabsSx(brandColor: string): SxProps<Theme> {
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
      fontSize: "0.875rem",
      textTransform: "none",
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
