import { useMemo } from "react";
import { Fade, Stack, Typography } from "@mui/material";
import type { PublicViewState } from "@meyouquize/shared";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { ProjectorFirstCorrectHero } from "./ProjectorFirstCorrectHero";
import { QuestionChart } from "./QuestionChart";

export type ProjectorQuestionSectionProps = {
  selectedQuestion: ProjectorQuestionResult;
  view: PublicViewState;
  showProjectorWinnersHero: boolean;
  fullScreenCloud: boolean;
  isTagCloudQuestion: boolean;
  firstCorrectWinnersShown: string[];
};

export function ProjectorQuestionSection(props: ProjectorQuestionSectionProps) {
  const {
    selectedQuestion,
    view,
    showProjectorWinnersHero,
    fullScreenCloud,
    isTagCloudQuestion,
    firstCorrectWinnersShown,
  } = props;
  const questionLength = selectedQuestion.text.trim().length;
  const longTextPenalty = Math.min(1.35, Math.max(0, (questionLength - 70) / 160));
  const optionsCountPenalty =
    selectedQuestion.optionStats.length > 6
      ? Math.min(0.45, (selectedQuestion.optionStats.length - 6) * 0.08)
      : 0;
  const desktopQuestionFontRem = Math.max(1.85, 3.05 - longTextPenalty - optionsCountPenalty);
  const mobileQuestionFontRem = Math.max(1.6, desktopQuestionFontRem - 0.35);
  const waitingForFirstWinner =
    view.showFirstCorrectAnswerer &&
    !showProjectorWinnersHero &&
    (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined) &&
    selectedQuestion.projectorShowFirstCorrect !== false &&
    selectedQuestion.rankingKind !== "jury" &&
    firstCorrectWinnersShown.length === 0;

  const tagCloudHeader = useMemo(() => {
    if (!isTagCloudQuestion || view.questionRevealStage !== "options") return undefined;
    return (
      <Typography
        variant="h3"
        align="center"
        sx={{
          fontWeight: 700,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          bgcolor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
          fontSize: {
            xs: `${mobileQuestionFontRem}rem`,
            md: `${desktopQuestionFontRem}rem`,
          },
          color: view.voteQuestionTextColor,
          fontFamily: view.brandFontFamily,
          width: "100%",
          maxWidth: 1280,
          px: fullScreenCloud ? 2 : 0,
          pt: fullScreenCloud ? 1 : 0,
          pb: fullScreenCloud ? 1 : 1.5,
        }}
      >
        {selectedQuestion.text}
      </Typography>
    );
  }, [
    desktopQuestionFontRem,
    fullScreenCloud,
    isTagCloudQuestion,
    mobileQuestionFontRem,
    selectedQuestion.text,
    view.brandFontFamily,
    view.questionRevealStage,
    view.voteQuestionTextColor,
  ]);

  return (
    <Stack
      spacing={showProjectorWinnersHero ? 2 : fullScreenCloud ? 2 : isTagCloudQuestion ? 0 : 5}
      sx={{
        width: "100%",
        ...(fullScreenCloud ? { height: "100%" } : {}),
        ...(showProjectorWinnersHero
          ? {
              flex: 1,
              minHeight: 0,
              alignSelf: "stretch",
              justifyContent: "center",
              alignItems: "center",
            }
          : {
              ...(!fullScreenCloud && !isTagCloudQuestion
                ? {
                    flex: 1,
                    height: "100%",
                    minHeight: 0,
                    justifyContent: "center",
                    alignItems: "center",
                  }
                : {}),
            }),
      }}
    >
      {showProjectorWinnersHero ? (
        <ProjectorFirstCorrectHero
          questionText={selectedQuestion.text}
          textColor={view.voteQuestionTextColor}
          winnerNames={firstCorrectWinnersShown}
        />
      ) : waitingForFirstWinner ? (
        <Stack
          spacing={0}
          sx={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: view.voteQuestionTextColor,
              fontFamily: view.brandFontFamily,
            }}
          >
            Ожидаем первого победителя
          </Typography>
        </Stack>
      ) : (
        <>
          {!isTagCloudQuestion && (
            <Typography
              variant="h3"
              align="center"
              sx={{
                fontWeight: 700,
                mb: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                bgcolor: "transparent",
                backgroundImage: "none",
                boxShadow: "none",
                fontSize: {
                  xs: `${mobileQuestionFontRem}rem`,
                  md: `${desktopQuestionFontRem}rem`,
                },
                px: fullScreenCloud ? 2 : 0,
                pt: fullScreenCloud ? 2 : 0,
                color: view.voteQuestionTextColor,
                fontFamily: view.brandFontFamily,
                ...(!fullScreenCloud ? { width: "100%" } : {}),
              }}
            >
              {selectedQuestion.text}
            </Typography>
          )}
          <Fade
            in
            key={`question-${selectedQuestion.questionId}-${view.questionRevealStage}`}
            timeout={350}
          >
            <Stack
              sx={
                fullScreenCloud
                  ? { width: "100%", flex: 1, minHeight: 0, pb: 1 }
                  : { width: "100%" }
              }
            >
              <QuestionChart
                question={selectedQuestion}
                showVoteCount={view.showVoteCount}
                showCorrectOption={view.showCorrectOption}
                questionRevealStage={view.questionRevealStage}
                fillHeight={fullScreenCloud}
                hiddenTagTexts={view.hiddenTagTexts}
                injectedTagWords={view.injectedTagWords}
                tagCountOverrides={view.tagCountOverrides}
                cloudTagColors={view.cloudTagColors}
                cloudTopTagColor={view.cloudTopTagColor}
                cloudCorrectTagColor={view.cloudCorrectTagColor}
                cloudDensity={view.cloudDensity}
                cloudTagPadding={view.cloudTagPadding}
                cloudSpiral={view.cloudSpiral}
                cloudAnimationStrength={view.cloudAnimationStrength}
                voteOptionTextColor={view.voteOptionTextColor}
                voteProgressTrackColor={view.voteProgressTrackColor}
                voteProgressBarColor={view.voteProgressBarColor}
                brandPrimaryColor={view.brandPrimaryColor}
                cloudHeader={tagCloudHeader}
              />
            </Stack>
          </Fade>
        </>
      )}
    </Stack>
  );
}
