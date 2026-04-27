import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  formatPlayerResultStatValue,
  resolveRankingMetricMode,
} from "../../features/quizPlay/playerVisibleResultsFormat";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";

type Props = {
  open: boolean;
  tile: PlayerVisibleResultTile | null;
  brandPrimaryColor: string;
  submittedAnswersByQuestionId: Record<string, string[]>;
  onClose: () => void;
};

export function PlayerVoteResultsDialog(props: Props) {
  const { open, tile, brandPrimaryColor, submittedAnswersByQuestionId, onClose } = props;
  const selectedIds = tile
    ? new Set(submittedAnswersByQuestionId[tile.questionId] ?? [])
    : new Set<string>();
  const correctIds = tile
    ? new Set(tile.optionStats.filter((row) => row.isCorrect).map((row) => row.optionId))
    : new Set<string>();
  const rankingMetricMode = tile ? resolveRankingMetricMode(tile) : null;
  const total = tile ? tile.optionStats.reduce((sum, row) => sum + row.count, 0) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: "rgba(0, 0, 0, 0.9)",
          color: "#fff",
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 0.5,
          pb: 1,
          color: "#fff",
          fontSize: "1.05rem",
          textDecoration: "underline",
          textDecorationColor: "primary.main",
          textUnderlineOffset: "4px",
        }}
      >
        Результаты голосования
        <IconButton aria-label="Закрыть" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0.5, pb: 3, color: "#fff" }}>
        {tile ? (
          <Stack spacing={1.2} sx={{ pt: 0.5 }}>
            <Typography
              variant="subtitle1"
              style={{ marginBottom: "16px" }}
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.3rem", sm: "1.45rem" },
                lineHeight: 1.25,
              }}
            >
              {tile.text}
            </Typography>
            {tile.optionStats.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              const isUserAnswer = selectedIds.has(row.optionId);
              const isCorrectAnswer = correctIds.has(row.optionId);
              const canShowUserAnswer = tile.type !== "ranking";
              const rightStatValue = formatPlayerResultStatValue(row, rankingMetricMode, pct);
              return (
                <Box key={`${tile.questionId}_${row.optionId}`}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {isCorrectAnswer ? (
                      <CheckCircleIcon
                        sx={{ fontSize: 16, color: "#9cffac", mt: "1px", flexShrink: 0 }}
                      />
                    ) : null}
                    <Box sx={{ position: "relative", flex: 1 }}>
                      <LinearProgress
                        color="primary"
                        variant="determinate"
                        value={pct}
                        sx={{
                          position: "absolute",
                          inset: 0,
                          height: "100%",
                          borderRadius: "5px",
                          pl: "0px",
                          pr: "0px",
                          bgcolor: alpha(brandPrimaryColor, 0.35),
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: brandPrimaryColor,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        title={row.text}
                        sx={{
                          position: "relative",
                          display: "block",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "1rem",
                          textShadow: "0 1px 2px rgba(0,0,0,0.65)",
                          pointerEvents: "none",
                          px: 1.25,
                          py: 0.8,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          lineHeight: 1.15,
                        }}
                      >
                        {row.text}
                        {isUserAnswer && canShowUserAnswer ? (
                          <Box component="span" sx={{ ml: 0.8, color: "#ffd54f", fontWeight: 700 }}>
                            (ваш ответ)
                          </Box>
                        ) : null}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1rem",
                        minWidth: 44,
                        textAlign: "right",
                      }}
                    >
                      {rightStatValue}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
