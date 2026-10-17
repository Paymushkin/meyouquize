import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  contrastingTextOnColor,
  optionText,
  optionTextTrimmed,
  voteProgressTrackBackground,
  withDebateOptionColors,
} from "@meyouquize/shared";
import { ProjectorSideBySideContent } from "./ProjectorSideBySideContent";
import {
  projectorOptionRevealMinHeight,
  questionHasOptionImages,
} from "../../features/quizPlay/voteOptionImages";

type DebateRow = {
  optionId: string;
  text?: string;
  imageUrl?: string;
  color?: string;
  percent: number;
  percentLabel: string;
};

export type ProjectorDebateSideBySideChartProps = {
  rows: DebateRow[];
  questionRevealStage: "options" | "results";
  voteOptionTextColor: string;
  voteOptionBorderColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  /** Компактная шкала: `compact` — мельче с подписями; `bar` — только цветные полоски. */
  density?: "default" | "compact" | "bar";
};

/** Минимальная доля сегмента на шкале — нулевые варианты остаются видимыми. */
export const DEBATE_MIN_SEGMENT_DISPLAY_PERCENT = 6;

/** Процент без лишних десятых: 100% / 33.3%. */
export function formatDebatePercentLabel(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

/** Цвета сегментов: как в админке — сохранённый цвет или дефолт по индексу. */
export function debateSideBySideSegmentColors(
  rows: Array<{ text?: string; color?: string | null }>,
): string[] {
  return withDebateOptionColors(rows).map((row) => row.color);
}

/** Заливка сегмента — полный цвет партии, в том числе при 0%. */
export function debateSegmentFillColor(color: string): string {
  return color;
}

/** Текст на сегменте контрастен к полной заливке, без полупрозрачности. */
export function debateSegmentLabelColor(color: string): string {
  return contrastingTextOnColor(color);
}

export function ProjectorDebateSideBySideChart(props: ProjectorDebateSideBySideChartProps) {
  const {
    rows,
    questionRevealStage,
    voteOptionTextColor,
    voteOptionBorderColor,
    voteProgressTrackColor,
    density = "default",
  } = props;
  const compact = density === "compact" || density === "bar";
  const barOnly = density === "bar";
  const hasOptionImages = questionHasOptionImages(rows);
  const isOptionsStage = questionRevealStage === "options";

  if (isOptionsStage) {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
          gap: { xs: 1.5, md: 2.5 },
          width: "100%",
        }}
      >
        {rows.map((row) => (
          <Box
            key={row.optionId}
            sx={{
              minHeight: projectorOptionRevealMinHeight(hasOptionImages),
              borderRadius: 2,
              px: { xs: 2, md: 3 },
              py: { xs: 2, md: 2.5 },
              display: "flex",
              alignItems: "center",
              border: "2px solid",
              borderColor: voteOptionBorderColor,
            }}
          >
            <ProjectorSideBySideContent
              imageUrl={row.imageUrl}
              alt={optionTextTrimmed(row.text) || "Вариант"}
              spacing={1.5}
              imageSx={{
                width: { xs: 96, md: 120 },
                maxWidth: { xs: 96, md: 120 },
                maxHeight: { xs: 96, md: 120 },
                borderRadius: 1.25,
              }}
            >
              {optionTextTrimmed(row.text) ? (
                <Typography
                  variant="h4"
                  align="left"
                  sx={{
                    color: voteOptionTextColor,
                    lineHeight: 1.2,
                    fontSize: { xs: "1.35rem", md: "1.85rem" },
                    fontWeight: 500,
                  }}
                >
                  {optionText(row.text)}
                </Typography>
              ) : null}
            </ProjectorSideBySideContent>
          </Box>
        ))}
      </Box>
    );
  }

  const totalPercent = rows.reduce((sum, row) => sum + row.percent, 0);
  const widths = debateSideBySideSegmentWidths(
    rows.map((row) => row.percent),
    totalPercent,
  );
  const segmentColors = debateSideBySideSegmentColors(rows);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: barOnly ? { xs: 28, md: 36 } : compact ? { xs: 56, md: 72 } : { xs: 112, md: 168 },
        borderRadius: compact ? 1.5 : 2.5,
        overflow: "hidden",
        border: compact ? "1.5px solid" : "2px solid",
        borderColor: voteOptionBorderColor,
        boxSizing: "border-box",
        bgcolor: voteProgressTrackBackground(voteProgressTrackColor),
        boxShadow: compact ? "none" : `inset 0 0 0 1px ${alpha(voteOptionTextColor, 0.08)}`,
      }}
      role="img"
      aria-label="Шкала распределения голосов по позициям"
    >
      {rows.map((row, index) => {
        const color = segmentColors[index]!;
        const width = widths[index] ?? 0;
        const optionLabel = optionTextTrimmed(row.text);
        const showName = !barOnly && optionLabel.length > 0;
        const fillColor = debateSegmentFillColor(color);
        const labelColor = debateSegmentLabelColor(color);
        const compactPercent = width < 14;
        const compactName = width < 22;
        return (
          <Box
            key={row.optionId}
            title={barOnly ? `${optionLabel}: ${formatDebatePercentLabel(row.percent)}` : undefined}
            sx={{
              flexGrow: width,
              flexShrink: 0,
              flexBasis: 0,
              minWidth: 0,
              height: "100%",
              bgcolor: fillColor,
              transition:
                "flex-grow 0.55s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.35s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: barOnly ? 0 : compact ? { xs: 0.25, md: 0.4 } : { xs: 0.75, md: 1.25 },
              px: barOnly ? 0 : compactPercent ? 0.35 : 0.75,
              borderRight:
                index < rows.length - 1
                  ? `${compact ? 1.5 : 2}px solid ${alpha(voteOptionBorderColor, 0.55)}`
                  : "none",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {!barOnly ? (
              <Typography
                variant="h3"
                sx={{
                  color: labelColor,
                  fontWeight: 800,
                  fontSize: compact
                    ? compactPercent
                      ? { xs: "0.75rem", md: "0.95rem" }
                      : { xs: "0.9rem", md: "1.15rem" }
                    : compactPercent
                      ? { xs: "1.25rem", md: "1.85rem" }
                      : {
                          xs: width >= 22 ? "1.85rem" : "1.35rem",
                          md: width >= 22 ? "3rem" : "2.1rem",
                        },
                  lineHeight: 1.05,
                  textAlign: "center",
                  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDebatePercentLabel(row.percent)}
              </Typography>
            ) : null}
            {showName ? (
              <Typography
                variant="h6"
                title={optionLabel}
                sx={{
                  color: labelColor,
                  fontWeight: 700,
                  fontSize: compact
                    ? {
                        xs: compactName ? "0.65rem" : "0.75rem",
                        md: compactName ? "0.7rem" : "0.85rem",
                      }
                    : {
                        xs: compactName ? "0.8rem" : "1rem",
                        md: compactName ? "0.95rem" : "1.35rem",
                      },
                  lineHeight: 1.15,
                  textAlign: "center",
                  px: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  opacity: 0.95,
                }}
              >
                {optionLabel}
              </Typography>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Ширины сегментов пропорциональны долям, но каждый вариант занимает
 * не меньше minPercent — один лидер не заливает всю шкалу, нули видны.
 */
export function debateSideBySideSegmentWidths(
  percents: number[],
  totalPercent: number,
  minPercent: number = DEBATE_MIN_SEGMENT_DISPLAY_PERCENT,
): number[] {
  if (percents.length === 0) return [];
  if (totalPercent <= 0) {
    const equal = 100 / percents.length;
    return percents.map(() => equal);
  }
  const floored = percents.map((p) => Math.max(p, minPercent));
  const sum = floored.reduce((acc, p) => acc + p, 0);
  if (sum <= 0) return percents.map(() => 100 / percents.length);
  return floored.map((p) => (p / sum) * 100);
}

export function buildDebateSideBySideRows(
  optionStats: Array<{
    optionId: string;
    text?: string;
    imageUrl?: string;
    color?: string;
    count: number;
  }>,
  showVoteCount: boolean,
): DebateRow[] {
  const total = optionStats.reduce((sum, item) => sum + item.count, 0);
  return optionStats.map((o) => {
    const percent = total > 0 ? (o.count / total) * 100 : 0;
    const percentText = formatDebatePercentLabel(percent);
    const percentLabel = showVoteCount ? `${percentText} (${o.count})` : percentText;
    return {
      optionId: o.optionId,
      text: o.text ?? "",
      imageUrl: o.imageUrl,
      color: o.color,
      percent,
      percentLabel,
    };
  });
}
