import { Box, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  optionAltText,
  optionHasImage,
  PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE,
} from "../../features/quizPlay/voteOptionImages";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";
import { QuestionAssetImage } from "./QuestionAssetImage";

type Props = {
  tile: PlayerVisibleResultTile;
  playerVoteOptionTextColor: string;
  playerVoteProgressBarColor: string;
  onSelect: () => void;
};

function ResultPreviewOptionRow(props: {
  row: PlayerVisibleResultTile["optionStats"][number];
  pct: number;
  optionTextColor: string;
  progressBarColor: string;
}) {
  const { row, pct, optionTextColor, progressBarColor } = props;
  const hasImage = optionHasImage(row.imageUrl);
  const hasText = Boolean(row.text.trim());

  return (
    <Box sx={{ p: 0, minWidth: 0 }}>
      <Box
        sx={{
          position: "relative",
          borderRadius: "5px",
          overflow: "hidden",
          minHeight: hasImage && !hasText ? 36 : undefined,
        }}
      >
        <LinearProgress
          color="primary"
          variant="determinate"
          value={pct}
          sx={{
            position: "absolute",
            inset: 0,
            height: "100%",
            bgcolor: alpha(progressBarColor, 0.35),
            "& .MuiLinearProgress-bar": {
              backgroundColor: progressBarColor,
            },
          }}
        />
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            position: "relative",
            pointerEvents: "none",
            px: 1,
            py: 0.75,
            width: "100%",
            minWidth: 0,
          }}
        >
          {hasImage ? (
            <QuestionAssetImage
              url={row.imageUrl}
              alt={optionAltText(row.text)}
              width={PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE}
              height={PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE}
              maxWidth={PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE}
              maxHeight={PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE}
              borderRadius={0.5}
              objectFit="cover"
            />
          ) : null}
          {hasText ? (
            <Typography
              variant="caption"
              component="div"
              title={row.text}
              sx={{
                color: optionTextColor,
                fontWeight: 400,
                fontSize: "clamp(0.8rem, 3.2cqw, 0.95rem)",
                flex: 1,
                minWidth: 0,
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
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}

export function PlayerVisibleResultTileCard(props: Props) {
  const { tile, playerVoteOptionTextColor, playerVoteProgressBarColor, onSelect } = props;
  const total = tile.optionStats.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card
      variant="outlined"
      component="button"
      type="button"
      onClick={onSelect}
      sx={{
        gridColumn: "span 1",
        width: "100%",
        aspectRatio: "1 / 1",
        textAlign: "left",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "rgba(0,0,0,0.22)",
        backdropFilter: "blur(3px)",
        p: 1.75,
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 42,
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
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Stack spacing={1.5} sx={{ height: "100%", minWidth: 0, overflow: "hidden" }}>
          {optionHasImage(tile.imageUrl) ? (
            <QuestionAssetImage
              url={tile.imageUrl}
              alt={optionAltText(tile.text, "Вопрос")}
              sx={{ width: "100%", maxHeight: 72, borderRadius: 1, flexShrink: 0 }}
              objectFit="cover"
            />
          ) : null}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              fontSize: "clamp(0.85rem, 3.6cqw, 1.05rem)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              flexShrink: 0,
            }}
            title={tile.text}
          >
            {tile.text}
          </Typography>
          <Stack spacing={1.15} sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            {tile.optionStats.slice(0, 3).map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
              return (
                <ResultPreviewOptionRow
                  key={`${tile.questionId}_${row.optionId}`}
                  row={row}
                  pct={pct}
                  optionTextColor={playerVoteOptionTextColor}
                  progressBarColor={playerVoteProgressBarColor}
                />
              );
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
