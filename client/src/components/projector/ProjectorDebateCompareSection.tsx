import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  buildDebateCompareRows,
  formatDebateSwingLabel,
  optionTextTrimmed,
  voteProgressBarFillStyle,
  voteProgressTrackBackground,
  voteQuestionTextTypographyStyle,
  VOTE_MIN_BAR_DISPLAY_PERCENT,
} from "@meyouquize/shared";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { ProjectorSideBySideContent } from "./ProjectorSideBySideContent";
import {
  buildProjectorQuestionTitleTypographySx,
  projectorQuestionTitleFontSizeSx,
} from "../../features/voteUi/voteQuestionLayout";

export type ProjectorDebateCompareSectionProps = {
  baselineQuestion: ProjectorQuestionResult;
  finalQuestion: ProjectorQuestionResult;
  showVoteCount: boolean;
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  brandFontFamily?: string;
};

export function ProjectorDebateCompareSection(props: ProjectorDebateCompareSectionProps) {
  const {
    baselineQuestion,
    finalQuestion,
    showVoteCount,
    voteQuestionTextColor,
    voteOptionTextColor,
    voteProgressTrackColor,
    voteProgressBarColor,
  } = props;

  const rows = buildDebateCompareRows(
    baselineQuestion.optionStats.map((o) => ({
      optionId: o.optionId,
      text: o.text ?? "",
      count: o.count,
    })),
    finalQuestion.optionStats.map((o) => ({
      optionId: o.optionId,
      text: o.text ?? "",
      count: o.count,
    })),
  );
  const swingLabel = formatDebateSwingLabel(rows);
  const questionText =
    optionTextTrimmed(finalQuestion.text) || optionTextTrimmed(baselineQuestion.text);
  const questionTextSx = voteQuestionTextTypographyStyle(voteQuestionTextColor);
  const questionTitleTypographySx = buildProjectorQuestionTitleTypographySx({
    fontSize: projectorQuestionTitleFontSizeSx(questionText.length, rows.length),
    questionColorSx: questionTextSx,
    fontFamily: props.brandFontFamily,
  });

  return (
    <Stack spacing={4} sx={{ width: "100%" }}>
      {questionText ? (
        <ProjectorSideBySideContent
          imageUrl={finalQuestion.imageUrl ?? baselineQuestion.imageUrl}
          alt={questionText}
          spacing={3}
          imageSx={{
            width: { xs: 200, sm: 320, md: 440 },
            maxWidth: { xs: "48%", md: "52%" },
            maxHeight: { xs: "38vh", md: "52vh" },
          }}
        >
          <Typography variant="h3" align="left" sx={{ ...questionTitleTypographySx, mb: 0 }}>
            {questionText}
          </Typography>
        </ProjectorSideBySideContent>
      ) : null}

      <Stack spacing={3} sx={{ width: "100%" }}>
        {rows.map((row) => {
          const baselineBar =
            row.baselinePercent > 0 ? row.baselinePercent : VOTE_MIN_BAR_DISPLAY_PERCENT;
          const finalBar = row.finalPercent > 0 ? row.finalPercent : VOTE_MIN_BAR_DISPLAY_PERCENT;
          const deltaLabel =
            row.deltaPp > 0.05
              ? `+${row.deltaPp.toFixed(1)} п.п.`
              : row.deltaPp < -0.05
                ? `${row.deltaPp.toFixed(1)} п.п.`
                : "0 п.п.";
          const statLabel = showVoteCount
            ? `${row.finalPercent.toFixed(1)}% (${row.finalCount}) · было ${row.baselinePercent.toFixed(1)}%`
            : `${row.finalPercent.toFixed(1)}% · было ${row.baselinePercent.toFixed(1)}%`;

          return (
            <Box key={row.optionId} sx={{ width: "100%" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                sx={{ mb: 1, gap: 2 }}
              >
                <Typography
                  variant="h5"
                  sx={{ color: voteOptionTextColor, fontWeight: 600, flex: 1, minWidth: 0 }}
                >
                  {row.text}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="baseline" flexShrink={0}>
                  <Typography variant="body1" sx={{ color: voteOptionTextColor, opacity: 0.85 }}>
                    {deltaLabel}
                  </Typography>
                  <Typography variant="h6" sx={{ color: voteOptionTextColor, fontWeight: 700 }}>
                    {statLabel}
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ position: "relative", height: 28 }}>
                <LinearProgress
                  variant="determinate"
                  value={baselineBar}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    height: 28,
                    borderRadius: 99,
                    bgcolor: "transparent",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 99,
                      backgroundColor: alpha(voteProgressBarColor, 0.28),
                      border: `2px solid ${alpha(voteOptionTextColor, 0.35)}`,
                    },
                  }}
                />
                <LinearProgress
                  variant="determinate"
                  value={finalBar}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    height: 28,
                    borderRadius: 99,
                    bgcolor: voteProgressTrackBackground(voteProgressTrackColor),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 99,
                      ...voteProgressBarFillStyle(voteProgressBarColor),
                      transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                    },
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>

      {swingLabel ? (
        <Typography
          variant="h4"
          sx={{
            color: voteQuestionTextColor,
            fontWeight: 800,
            textAlign: "center",
            pt: 1,
          }}
        >
          {swingLabel}
        </Typography>
      ) : null}
    </Stack>
  );
}
