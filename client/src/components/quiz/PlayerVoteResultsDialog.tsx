import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import {
  formatPlayerResultStatValue,
  formatTemperatureResultHeadline,
  resolveRankingMetricMode,
} from "../../features/quizPlay/playerVisibleResultsFormat";
import { voteResultsDialogQuestionSx } from "../../features/voteUi/voteQuestionLayout";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";
import { QuestionAssetImage } from "./QuestionAssetImage";
import { VoteResultOptionRow } from "./VoteResultOptionRow";

type Props = {
  open: boolean;
  tile: PlayerVisibleResultTile | null;
  playerVoteOptionTextColor: string;
  playerVoteProgressBarColor: string;
  submittedAnswersByQuestionId: Record<string, string[]>;
  onClose: () => void;
};

export function PlayerVoteResultsDialog(props: Props) {
  const {
    open,
    tile,
    playerVoteOptionTextColor,
    playerVoteProgressBarColor,
    submittedAnswersByQuestionId,
    onClose,
  } = props;
  const selectedIds = tile
    ? new Set(submittedAnswersByQuestionId[tile.questionId] ?? [])
    : new Set<string>();
  const correctIds = tile
    ? new Set(tile.optionStats.filter((row) => row.isCorrect).map((row) => row.optionId))
    : new Set<string>();
  const rankingMetricMode = tile ? resolveRankingMetricMode(tile) : null;
  const total = tile ? tile.optionStats.reduce((sum, row) => sum + row.count, 0) : 0;
  const temperatureHeadline =
    tile?.type === "temperature"
      ? formatTemperatureResultHeadline(tile.temperatureValue, tile.temperatureSubtitle)
      : null;
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
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            <Stack spacing={0.75} sx={{ mb: 3 }}>
              {tile.imageUrl ? (
                <QuestionAssetImage
                  url={tile.imageUrl}
                  alt={tile.text.trim() || "Вопрос"}
                  maxHeight={140}
                />
              ) : null}
              {tile.text.trim() ? (
                <Typography variant="subtitle1" sx={voteResultsDialogQuestionSx()}>
                  {tile.text}
                </Typography>
              ) : null}
            </Stack>
            {temperatureHeadline ? (
              <Typography
                variant="body1"
                sx={{
                  color: playerVoteOptionTextColor,
                  fontWeight: 400,
                  fontSize: "0.95rem",
                  mb: 1.5,
                }}
              >
                {temperatureHeadline}
              </Typography>
            ) : null}
            {tile.optionStats.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              const isUserAnswer = selectedIds.has(row.optionId);
              const isCorrectAnswer = correctIds.has(row.optionId);
              const canShowUserAnswer = tile.type !== "ranking";
              const rightStatValue = formatPlayerResultStatValue(
                row,
                rankingMetricMode,
                pct,
                tile.type,
              );
              return (
                <VoteResultOptionRow
                  key={`${tile.questionId}_${row.optionId}`}
                  text={row.text}
                  imageUrl={row.imageUrl}
                  pct={pct}
                  rightStatValue={rightStatValue}
                  isCorrectAnswer={isCorrectAnswer}
                  isUserAnswer={isUserAnswer}
                  canShowUserAnswer={canShowUserAnswer}
                  playerVoteOptionTextColor={playerVoteOptionTextColor}
                  playerVoteProgressBarColor={playerVoteProgressBarColor}
                />
              );
            })}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
