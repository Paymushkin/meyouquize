import { useMemo } from "react";
import { Fade, Stack, Typography } from "@mui/material";
import {
  isGeoPollDictionary,
  optionTextTrimmed,
  voteQuestionTextTypographyStyle,
  type PublicViewState,
} from "@meyouquize/shared";
import {
  buildProjectorQuestionTitleTypographySx,
  projectorQuestionTitleFontSizeSx,
} from "../../features/voteUi/voteQuestionLayout";
import type { ProjectorQuestionResult } from "../../types/projectorDashboard";
import { ProjectorFirstCorrectHero } from "./ProjectorFirstCorrectHero";
import {
  buildDebateSideBySideRows,
  ProjectorDebateSideBySideChart,
} from "./ProjectorDebateSideBySideChart";
import { ProjectorSideBySideContent } from "./ProjectorSideBySideContent";
import { QuestionChart } from "./QuestionChart";

export type ProjectorQuestionSectionProps = {
  selectedQuestion: ProjectorQuestionResult;
  view: PublicViewState;
  showProjectorWinnersHero: boolean;
  fullScreenCloud: boolean;
  isTagCloudQuestion: boolean;
  firstCorrectWinnersShown: string[];
  /** Компактные шкалы раундов под накопительным итогом серии. */
  debateSeriesRounds?: ProjectorQuestionResult[];
};

/** Подпись раунда слева от компактной шкалы на проекторе. */
export function formatDebateSeriesRoundLabel(
  round: Pick<ProjectorQuestionResult, "debateRoundIndex">,
  index: number,
): string {
  return `Раунд ${(round.debateRoundIndex ?? index) + 1}`;
}

export function ProjectorQuestionSection(props: ProjectorQuestionSectionProps) {
  const {
    selectedQuestion,
    view,
    showProjectorWinnersHero,
    fullScreenCloud,
    isTagCloudQuestion,
    firstCorrectWinnersShown,
    debateSeriesRounds = [],
  } = props;
  const questionLength = optionTextTrimmed(selectedQuestion.text).length;
  const isGeoPoll = isGeoPollDictionary(selectedQuestion.geoPollDictionary);
  /** Для geo-poll города в optionStats растут — не должны сжимать заголовок. */
  const titleOptionsCount = isGeoPoll ? 0 : (selectedQuestion.optionStats?.length ?? 0);
  const waitingForFirstWinner =
    view.showFirstCorrectAnswerer &&
    !showProjectorWinnersHero &&
    (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined) &&
    selectedQuestion.projectorShowFirstCorrect !== false &&
    selectedQuestion.rankingKind !== "jury" &&
    firstCorrectWinnersShown.length === 0;

  const questionTextSx = useMemo(
    () => voteQuestionTextTypographyStyle(view.voteQuestionTextColor),
    [view.voteQuestionTextColor],
  );
  const questionTitleTypographySx = useMemo(
    () =>
      buildProjectorQuestionTitleTypographySx({
        fontSize: projectorQuestionTitleFontSizeSx(questionLength, titleOptionsCount),
        questionColorSx: questionTextSx,
        fontFamily: view.brandFontFamily,
      }),
    [questionLength, questionTextSx, titleOptionsCount, view.brandFontFamily],
  );

  const projectorQuestionImageSx = {
    width: { xs: 200, sm: 320, md: 440, lg: 520 },
    maxWidth: { xs: "48%", md: "52%" },
    maxHeight: { xs: "38vh", md: "52vh" },
  } as const;

  const questionTitle = optionTextTrimmed(selectedQuestion.text);
  const questionTitleBlock = (
    <ProjectorSideBySideContent
      imageUrl={selectedQuestion.imageUrl}
      alt={questionTitle || "Вопрос"}
      spacing={3}
      imageSx={projectorQuestionImageSx}
    >
      {questionTitle ? (
        <Typography
          variant="h3"
          align="left"
          sx={{
            ...questionTitleTypographySx,
            mb: 0,
            px: 0,
            pt: 0,
          }}
        >
          {selectedQuestion.text}
        </Typography>
      ) : null}
    </ProjectorSideBySideContent>
  );

  const tagCloudHeader = useMemo(() => {
    if (!isTagCloudQuestion || view.questionRevealStage !== "options") return undefined;
    return (
      <Stack spacing={1.5} sx={{ width: "100%" }}>
        <ProjectorSideBySideContent
          imageUrl={selectedQuestion.imageUrl}
          alt={questionTitle || "Вопрос"}
          spacing={3}
          imageSx={projectorQuestionImageSx}
        >
          {questionTitle ? (
            <Typography
              variant="h3"
              align="left"
              sx={{
                ...questionTitleTypographySx,
                px: 0,
                pt: 0,
                pb: view.questionRevealStage === "options" ? 1 : 1.5,
              }}
            >
              {selectedQuestion.text}
            </Typography>
          ) : null}
        </ProjectorSideBySideContent>
      </Stack>
    );
  }, [
    fullScreenCloud,
    isTagCloudQuestion,
    questionTitle,
    questionTitleTypographySx,
    selectedQuestion.imageUrl,
    selectedQuestion.text,
    view.questionRevealStage,
  ]);

  return (
    <Stack
      spacing={showProjectorWinnersHero ? 2 : fullScreenCloud ? 2 : isTagCloudQuestion ? 0 : 5}
      sx={{
        width: "100%",
        ...(fullScreenCloud &&
        isTagCloudQuestion &&
        view.questionRevealStage === "options" &&
        !showProjectorWinnersHero
          ? { height: "auto", flex: "none", justifyContent: "center" }
          : fullScreenCloud
            ? { height: "100%", flex: 1, minHeight: 0 }
            : {}),
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
                    alignItems: "flex-start",
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
              ...questionTextSx,
              fontFamily: view.brandFontFamily,
            }}
          >
            Ожидаем первого победителя
          </Typography>
        </Stack>
      ) : (
        <>
          {!isTagCloudQuestion && (
            <Stack spacing={1.5} sx={{ width: "100%" }}>
              {questionTitleBlock}
            </Stack>
          )}
          <Fade
            in
            key={
              isTagCloudQuestion
                ? `question-${selectedQuestion.questionId}`
                : `question-${selectedQuestion.questionId}-${view.questionRevealStage}`
            }
            timeout={isTagCloudQuestion ? 0 : 350}
          >
            <Stack
              sx={
                fullScreenCloud && view.questionRevealStage === "results"
                  ? { width: "100%", flex: 1, minHeight: 0, pb: 1 }
                  : fullScreenCloud
                    ? { width: "100%", flex: "none" }
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
                voteOptionBorderColor={view.voteOptionBorderColor}
                voteProgressTrackColor={view.voteProgressTrackColor}
                voteProgressBarColor={view.voteProgressBarColor}
                brandPrimaryColor={view.brandPrimaryColor}
                brandFontFamily={view.brandFontFamily}
                cloudHeader={tagCloudHeader}
              />
              {view.mode === "debate_series" && debateSeriesRounds.length > 0 ? (
                <Stack spacing={0.75} sx={{ width: "100%", mt: { xs: 1.5, md: 2 } }}>
                  {debateSeriesRounds.map((round, index) => {
                    const rows = buildDebateSideBySideRows(round.optionStats, false);
                    const roundLabel = formatDebateSeriesRoundLabel(round, index);
                    return (
                      <Stack
                        key={round.questionId}
                        direction="row"
                        alignItems="center"
                        spacing={{ xs: 1, md: 1.5 }}
                        sx={{ width: "100%" }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            flexShrink: 0,
                            minWidth: { xs: 64, md: 88 },
                            fontWeight: 700,
                            fontSize: { xs: "0.85rem", md: "1rem" },
                            lineHeight: 1.2,
                            color: view.voteOptionTextColor,
                            opacity: 0.9,
                            fontFamily: view.brandFontFamily || undefined,
                          }}
                        >
                          {roundLabel}
                        </Typography>
                        <Stack sx={{ flex: 1, minWidth: 0 }}>
                          <ProjectorDebateSideBySideChart
                            rows={rows}
                            questionRevealStage="results"
                            density="bar"
                            voteOptionTextColor={view.voteOptionTextColor}
                            voteOptionBorderColor={view.voteOptionBorderColor}
                            voteProgressTrackColor={view.voteProgressTrackColor}
                            voteProgressBarColor={view.voteProgressBarColor}
                          />
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              ) : null}
            </Stack>
          </Fade>
        </>
      )}
    </Stack>
  );
}
