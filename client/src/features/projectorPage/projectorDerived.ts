import type { PublicViewState } from "@meyouquize/shared";
import type { ProjectorLeader, ProjectorQuestionResult } from "../../types/projectorDashboard";
import type { ProjectorSessionState } from "./projectorSessionReducer";

export type ProjectorDerived = {
  selectedQuestion: ProjectorQuestionResult | undefined;
  leadersShown: ProjectorLeader[];
  winnersRowsCount: number;
  showEventTitleScreen: boolean;
  isTagCloudQuestion: boolean;
  firstCorrectWinnersShown: string[];
  showProjectorWinnersHero: boolean;
  fullScreenCloud: boolean;
  fullScreenContainer: boolean;
  barQuestionCentered: boolean;
};

export function computeProjectorDerived(state: ProjectorSessionState): ProjectorDerived {
  const { questions, leaders, view } = state;
  const {
    mode,
    questionId: publicQuestionId,
    highlightedLeadersCount,
    firstCorrectWinnersCount,
  } = view;

  const selectedQuestion =
    mode === "question" && publicQuestionId
      ? questions.find((q) => q.questionId === publicQuestionId)
      : undefined;

  const leadersShown = leaders.slice(0, Math.max(0, Math.min(100, highlightedLeadersCount)));

  const winnersRowsCount = Math.max(
    0,
    Math.min(20, Math.min(leadersShown.length, Math.trunc(firstCorrectWinnersCount))),
  );

  const showEventTitleScreen =
    mode === "title" ||
    (mode === "question" && !selectedQuestion) ||
    (mode === "leaderboard" && leadersShown.length === 0);

  const isTagCloudQuestion =
    !!selectedQuestion &&
    (selectedQuestion.type === "tag_cloud" || selectedQuestion.optionStats.length === 0);

  const raw = selectedQuestion?.firstCorrectNicknames ?? [];
  const standalone =
    selectedQuestion &&
    (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined);
  const cap = standalone
    ? Math.max(
        1,
        Math.min(
          20,
          selectedQuestion.projectorFirstCorrectWinnersCount ?? firstCorrectWinnersCount,
        ),
      )
    : Math.max(1, Math.min(20, firstCorrectWinnersCount));
  const firstCorrectWinnersShown = raw.slice(0, cap);

  const showFirstCorrectAnswerer = view.showFirstCorrectAnswerer;

  const showProjectorWinnersHero =
    mode === "question" &&
    !!selectedQuestion &&
    showFirstCorrectAnswerer &&
    (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined) &&
    selectedQuestion.projectorShowFirstCorrect !== false &&
    selectedQuestion.rankingKind !== "jury" &&
    firstCorrectWinnersShown.length > 0;

  const fullScreenCloud = mode === "question" && isTagCloudQuestion && !showProjectorWinnersHero;
  const fullScreenContainer = fullScreenCloud || showEventTitleScreen;
  const barQuestionCentered = mode === "question" && !!selectedQuestion && !fullScreenCloud;

  return {
    selectedQuestion,
    leadersShown,
    winnersRowsCount,
    showEventTitleScreen,
    isTagCloudQuestion,
    firstCorrectWinnersShown,
    showProjectorWinnersHero,
    fullScreenCloud,
    fullScreenContainer,
    barQuestionCentered,
  };
}

/** Для отладки в DEV: снимок условий героя «первые верные». */
export function buildProjectorWinnersHeroDebugInfo(
  view: PublicViewState,
  derived: ProjectorDerived,
): Record<string, boolean | number | string | undefined> {
  const {
    selectedQuestion,
    isTagCloudQuestion,
    firstCorrectWinnersShown,
    showProjectorWinnersHero,
  } = derived;
  return {
    modeIsQuestion: view.mode === "question",
    hasSelectedQuestion: !!selectedQuestion,
    notTagCloudLayout: !isTagCloudQuestion,
    showFirstCorrectFlag: view.showFirstCorrectAnswerer,
    isStandalone:
      !!selectedQuestion &&
      (selectedQuestion.subQuizId === null || selectedQuestion.subQuizId === undefined),
    typeOk: true,
    projectorAllowsFirstCorrect: selectedQuestion?.projectorShowFirstCorrect !== false,
    winnersCount: firstCorrectWinnersShown.length,
    rawNicknamesLen: selectedQuestion?.firstCorrectNicknames?.length ?? 0,
    publicQuestionId: view.questionId,
    willShowHero: showProjectorWinnersHero,
  };
}
