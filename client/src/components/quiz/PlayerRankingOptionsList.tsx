import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { RefObject } from "react";
import { questionHasOptionImages } from "../../features/quizPlay/voteOptionImages";
import type { ActiveQuestion } from "../../pages/quiz-play/types";
import { OptionAnswerContent } from "./OptionAnswerContent";

type Props = {
  question: ActiveQuestion;
  rankingHint: string;
  answeredCurrentQuestion: boolean;
  submittedAnswers: Record<string, string[]>;
  rankOrder: string[];
  rankRowRefs: RefObject<Map<string, HTMLDivElement>>;
  moveRankOption: (optionId: string, direction: -1 | 1) => void;
  ruBallLabel: (n: number) => string;
};

export function PlayerRankingOptionsList(props: Props) {
  const {
    question,
    rankingHint,
    answeredCurrentQuestion,
    submittedAnswers,
    rankOrder,
    rankRowRefs,
    moveRankOption,
    ruBallLabel,
  } = props;
  const hasOptionImages = questionHasOptionImages(question.options);
  const orderedIds = answeredCurrentQuestion ? (submittedAnswers[question.id] ?? []) : rankOrder;

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {rankingHint ||
          (question.rankingKind === "jury"
            ? "Расставьте варианты от лучшего к худшему."
            : "Расставьте варианты от лучшего к худшему (первый в списке — лучший).")}
      </Typography>
      {orderedIds.map((id, idx) => {
        const option = question.options.find((o) => o.id === id);
        if (!option) return null;
        const tierPts =
          question.rankingKind === "jury" ? question.rankingPointsByRank?.[idx] : undefined;
        return (
          <Stack
            key={id}
            ref={(node) => {
              if (node) rankRowRefs.current.set(id, node);
              else rankRowRefs.current.delete(id);
            }}
            direction="row"
            spacing={1}
            alignItems={hasOptionImages ? "flex-start" : "center"}
            sx={{ width: "100%" }}
          >
            <Typography variant="body2" sx={{ width: 28, flexShrink: 0, fontWeight: 700 }}>
              {idx + 1}.
            </Typography>
            <Box
              sx={(theme) => ({
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: hasOptionImages ? "stretch" : "center",
                justifyContent: "space-between",
                gap: 1,
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.white, 0.06)
                    : alpha(theme.palette.common.black, 0.04),
                px: 1.5,
                py: 1.25,
              })}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <OptionAnswerContent
                  text={option.text}
                  imageUrl={option.imageUrl}
                  layout={hasOptionImages ? "card" : "inline"}
                  textSx={
                    hasOptionImages
                      ? undefined
                      : {
                          typography: "body2",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: 0.02,
                          color: "text.secondary",
                        }
                  }
                />
              </Box>
              {tierPts != null && (
                <Typography
                  variant="caption"
                  sx={{
                    flexShrink: 0,
                    fontWeight: 700,
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ruBallLabel(tierPts)}
                </Typography>
              )}
            </Box>
            {!answeredCurrentQuestion && (
              <>
                <IconButton
                  aria-label="Выше"
                  size="small"
                  disabled={idx === 0}
                  onClick={() => moveRankOption(id, -1)}
                >
                  <KeyboardArrowUpIcon />
                </IconButton>
                <IconButton
                  aria-label="Ниже"
                  size="small"
                  disabled={idx >= rankOrder.length - 1}
                  onClick={() => moveRankOption(id, 1)}
                >
                  <KeyboardArrowDownIcon />
                </IconButton>
              </>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
