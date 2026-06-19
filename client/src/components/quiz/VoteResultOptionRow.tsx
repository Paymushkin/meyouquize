import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  optionAltText,
  optionHasImage,
  optionImageUrl,
  PLAYER_VOTE_RESULT_OPTION_IMAGE_SIZE,
} from "../../features/quizPlay/voteOptionImages";
import { QuestionAssetImage } from "./QuestionAssetImage";
import { VoteResultsStatColumn } from "./VoteResultsStatColumn";

type Props = {
  text: string;
  imageUrl?: string | null;
  pct: number;
  rightStatValue: string;
  isCorrectAnswer: boolean;
  isUserAnswer: boolean;
  canShowUserAnswer: boolean;
  playerVoteOptionTextColor: string;
  playerVoteProgressBarColor: string;
};

export function VoteResultOptionRow(props: Props) {
  const {
    text,
    imageUrl,
    pct,
    rightStatValue,
    isCorrectAnswer,
    isUserAnswer,
    canShowUserAnswer,
    playerVoteOptionTextColor,
    playerVoteProgressBarColor,
  } = props;
  const hasOptionText = Boolean(text.trim());
  const imageSize = PLAYER_VOTE_RESULT_OPTION_IMAGE_SIZE;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {optionHasImage(imageUrl) ? (
        <QuestionAssetImage
          url={optionImageUrl(imageUrl)}
          alt={optionAltText(text)}
          width={imageSize}
          height={imageSize}
          maxWidth={imageSize}
          maxHeight={imageSize}
          borderRadius={0.75}
        />
      ) : null}
      <Box
        sx={{
          position: "relative",
          flex: 1,
          minWidth: 0,
          borderRadius: "4px",
          overflow: "hidden",
          minHeight: hasOptionText ? undefined : 26,
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
            borderRadius: "4px",
            bgcolor: alpha(playerVoteProgressBarColor, 0.35),
            "& .MuiLinearProgress-bar": {
              backgroundColor: playerVoteProgressBarColor,
            },
          }}
        />
        {hasOptionText ? (
          <Typography
            component="div"
            title={text}
            sx={{
              position: "relative",
              color: playerVoteOptionTextColor,
              fontWeight: 400,
              fontSize: { xs: "1.05rem", sm: "1.12rem" },
              pointerEvents: "none",
              px: 1,
              py: 0.55,
              whiteSpace: "normal",
              overflowWrap: "anywhere",
              lineHeight: 1.2,
            }}
          >
            {text}
          </Typography>
        ) : null}
      </Box>
      <VoteResultsStatColumn
        value={rightStatValue}
        isCorrectAnswer={isCorrectAnswer}
        isUserAnswer={isUserAnswer}
        canShowUserAnswer={canShowUserAnswer}
      />
    </Stack>
  );
}
