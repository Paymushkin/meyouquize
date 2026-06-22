import type { SxProps, Theme } from "@mui/material";

/** Межстрочный интервал заголовка вопроса (проектор, попап игрока). */
export const VOTE_QUESTION_TITLE_LINE_HEIGHT = 1.08;

/** Межстрочный интервал названия события на экране игрока. */
export const PLAYER_EVENT_TITLE_LINE_HEIGHT = 1.1;

export const VOTE_RESULTS_DIALOG_QUESTION_MB = "24px";

export const voteResultsStatLayout = {
  columnWidth: 68,
  percentWidth: 40,
  iconSlotWidth: 26,
  iconFontSize: 14,
  gap: 0.25,
} as const;

export function resolvePlayerQuestionFontRem(textLength: number): {
  mobile: number;
  desktop: number;
} {
  const longTextPenalty = Math.min(1.25, Math.max(0, (textLength - 72) / 170));
  const desktop = Math.max(1.6, 2.25 - longTextPenalty);
  const mobile = Math.max(1.05, desktop - 0.35);
  return { mobile, desktop };
}

export function playerQuestionTitleFontSizeSx(textLength: number): {
  xs: string;
  sm: string;
} {
  const { mobile, desktop } = resolvePlayerQuestionFontRem(textLength);
  return { xs: `${mobile}rem`, sm: `${desktop}rem` };
}

export function resolveProjectorQuestionFontRem(
  textLength: number,
  optionsCount: number,
): { mobile: number; desktop: number } {
  const longTextPenalty = Math.min(1.35, Math.max(0, (textLength - 70) / 160));
  const optionsCountPenalty = optionsCount > 6 ? Math.min(0.45, (optionsCount - 6) * 0.08) : 0;
  const scale = 1.5;
  const desktop = Math.max(1.85, 3.05 - longTextPenalty - optionsCountPenalty) * scale;
  const mobile = Math.max(1.6 * scale, desktop - 0.35 * scale);
  return { mobile, desktop };
}

export function projectorQuestionTitleFontSizeSx(
  textLength: number,
  optionsCount: number,
): { xs: string; md: string } {
  const { mobile, desktop } = resolveProjectorQuestionFontRem(textLength, optionsCount);
  return { xs: `${mobile}rem`, md: `${desktop}rem` };
}

export function buildProjectorQuestionTitleTypographySx(input: {
  fontSize: { xs: string; md: string };
  questionColorSx: Record<string, string | number>;
  fontFamily?: string;
}): SxProps<Theme> {
  return {
    fontWeight: 700,
    lineHeight: VOTE_QUESTION_TITLE_LINE_HEIGHT,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    bgcolor: "transparent",
    boxShadow: "none",
    fontSize: input.fontSize,
    textAlign: "left",
    ...input.questionColorSx,
    fontFamily: input.fontFamily,
    width: "100%",
  };
}

export function playerPopupQuestionTitleSx(textLength: number): SxProps<Theme> {
  return {
    fontWeight: 700,
    lineHeight: VOTE_QUESTION_TITLE_LINE_HEIGHT,
    fontSize: playerQuestionTitleFontSizeSx(textLength),
    py: 0.5,
  };
}

export function playerEventTitleSx(brandFontFamily?: string): SxProps<Theme> {
  return {
    width: "100%",
    fontWeight: 400,
    fontStyle: "normal",
    ...(brandFontFamily ? { fontFamily: brandFontFamily } : {}),
    letterSpacing: 0.2,
    fontSize: "clamp(1.4rem, 4.2vw, 2.45rem)",
    lineHeight: PLAYER_EVENT_TITLE_LINE_HEIGHT,
    whiteSpace: "pre-line",
    mb: 4,
  };
}

export function voteResultsDialogQuestionSx(): SxProps<Theme> {
  return {
    fontWeight: 700,
    fontSize: { xs: "1.3rem", sm: "1.45rem" },
    lineHeight: 1.25,
    pb: VOTE_RESULTS_DIALOG_QUESTION_MB,
  };
}

const voteResultsStatValueSx = {
  color: "#fff",
  fontWeight: 400,
  fontSize: { xs: "1.05rem", sm: "1.12rem" },
  flexShrink: 0,
  textAlign: "right",
  lineHeight: 1.2,
} as const;

export function voteResultsStatColumnSx(): SxProps<Theme> {
  const { columnWidth, gap } = voteResultsStatLayout;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap,
    width: columnWidth,
    flexShrink: 0,
  };
}

export function voteResultsStatPercentSx(): SxProps<Theme> {
  return {
    ...voteResultsStatValueSx,
    width: voteResultsStatLayout.percentWidth,
  };
}

export function voteResultsIconSlotSx(): SxProps<Theme> {
  return {
    width: voteResultsStatLayout.iconSlotWidth,
    minWidth: voteResultsStatLayout.iconSlotWidth,
    flexShrink: 0,
  };
}

export function voteResultsMarkerIconSx(color: string): SxProps<Theme> {
  return {
    fontSize: voteResultsStatLayout.iconFontSize,
    color,
    flexShrink: 0,
  };
}
