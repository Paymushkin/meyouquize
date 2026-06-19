import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Box, Stack, Typography } from "@mui/material";
import {
  voteResultsIconSlotSx,
  voteResultsMarkerIconSx,
  voteResultsStatColumnSx,
  voteResultsStatPercentSx,
} from "../../features/voteUi/voteQuestionLayout";

type Props = {
  value: string;
  isCorrectAnswer: boolean;
  isUserAnswer: boolean;
  canShowUserAnswer: boolean;
};

export function VoteResultsStatColumn(props: Props) {
  const { value, isCorrectAnswer, isUserAnswer, canShowUserAnswer } = props;
  return (
    <Box sx={voteResultsStatColumnSx()}>
      <Typography component="div" sx={voteResultsStatPercentSx()}>
        {value}
      </Typography>
      <Stack
        direction="row"
        spacing={0}
        alignItems="center"
        justifyContent="flex-end"
        sx={voteResultsIconSlotSx()}
      >
        {isCorrectAnswer ? <CheckCircleIcon sx={voteResultsMarkerIconSx("#9cffac")} /> : null}
        {isUserAnswer && canShowUserAnswer ? (
          <AccountCircleIcon sx={voteResultsMarkerIconSx("#ffd54f")} />
        ) : null}
      </Stack>
    </Box>
  );
}
