import {
  isGeoPollDictionary,
  resolveDebateSeriesResultTitle,
  resolveProjectorLeaderboardRows,
  applyOptionVoteCountOverrides,
  computeTemperatureWeightedAverage,
  resolveTagCloudManualForQuestion,
  sumDebateSeriesOptionStats,
  type PublicViewState,
} from "@meyouquize/shared";
import type { ProjectorLeader, ProjectorQuestionResult } from "../../types/projectorDashboard";
import type { ProjectorSessionState } from "./projectorSessionReducer";

export type ProjectorDerived = {
  selectedQuestion: ProjectorQuestionResult | undefined;
  debateCompareBaselineQuestion: ProjectorQuestionResult | undefined;
  debateCompareFinalQuestion: ProjectorQuestionResult | undefined;
  /** Раунды серии под накопительным итогом (если включено в админке). */
  debateSeriesRounds: ProjectorQuestionResult[];
  leadersShown: ProjectorLeader[];
  winnersRowsCount: number;
  showEventTitleScreen: boolean;
  isTagCloudQuestion: boolean;
  isGeoPollQuestion: boolean;
  firstCorrectWinnersShown: string[];
  showProjectorWinnersHero: boolean;
  fullScreenCloud: boolean;
  fullScreenContainer: boolean;
  barQuestionCentered: boolean;
};

export function computeProjectorDerived(
  state: ProjectorSessionState,
  options?: { speakerOnScreenCount?: number },
): ProjectorDerived {
  const { questions, leaders, leaderboardsBySubQuiz, view } = state;
  const {
    mode,
    questionId: publicQuestionId,
    highlightedLeadersCount,
    firstCorrectWinnersCount,
    leaderboardSubQuizId,
  } = view;
  const speakerOnScreenCount = Math.max(0, Math.trunc(options?.speakerOnScreenCount ?? 0));

  const rawSelectedQuestion =
    mode === "question" && publicQuestionId
      ? questions.find((q) => q.questionId === publicQuestionId)
      : mode === "debate_series"
        ? resolveDebateSeriesProjectorQuestion(questions, view)
        : undefined;

  // Накопительный итог серии не смешиваем с ручными override одного раунда.
  const selectedQuestion =
    mode === "debate_series" && view.debateSeriesView !== "round"
      ? rawSelectedQuestion
      : applyProjectorOptionVoteOverrides(rawSelectedQuestion, view);

  const rawDebateFinalQuestion =
    mode === "debate_compare" && view.debateCompareQuestionId
      ? questions.find((q) => q.questionId === view.debateCompareQuestionId)
      : undefined;
  const debateCompareFinalQuestion = applyProjectorOptionVoteOverrides(
    rawDebateFinalQuestion,
    view,
  );
  const debateBaselineId = debateCompareFinalQuestion?.debateBaselineQuestionId?.trim();
  const rawDebateBaselineQuestion =
    mode === "debate_compare" && debateBaselineId
      ? questions.find((q) => q.questionId === debateBaselineId)
      : undefined;
  const debateCompareBaselineQuestion = applyProjectorOptionVoteOverrides(
    rawDebateBaselineQuestion,
    view,
  );

  const leaderboardRows = resolveProjectorLeaderboardRows(
    leaderboardsBySubQuiz,
    leaderboardSubQuizId,
    leaders,
  );
  const leadersShown = leaderboardRows.slice(
    0,
    Math.max(0, Math.min(100, highlightedLeadersCount)),
  );

  const winnersRowsCount = Math.max(
    0,
    Math.min(20, Math.min(leadersShown.length, Math.trunc(firstCorrectWinnersCount))),
  );

  const showEventTitleScreen =
    mode === "title" ||
    (mode === "question" && !selectedQuestion) ||
    (mode === "debate_series" && !selectedQuestion) ||
    (mode === "debate_compare" &&
      (!debateCompareFinalQuestion || !debateCompareBaselineQuestion)) ||
    (mode === "leaderboard" && leadersShown.length === 0) ||
    (mode === "speaker_questions" && speakerOnScreenCount === 0);

  const isGeoPollQuestion = isGeoPollDictionary(selectedQuestion?.geoPollDictionary);
  const isTagCloudQuestion =
    !!selectedQuestion &&
    !isGeoPollQuestion &&
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
  const fullScreenContainer = showEventTitleScreen;
  const barQuestionCentered =
    (mode === "question" && !!selectedQuestion && (!fullScreenCloud || isGeoPollQuestion)) ||
    (mode === "debate_series" && !!selectedQuestion) ||
    (mode === "debate_compare" && !!debateCompareFinalQuestion && !!debateCompareBaselineQuestion);

  const debateSeriesRounds =
    mode === "debate_series" && view.debateSeriesView !== "round" && view.debateSeriesShowRounds
      ? resolveDebateSeriesProjectorRounds(questions, view).map(
          (round) => applyProjectorOptionVoteOverrides(round, view) ?? round,
        )
      : [];

  return {
    selectedQuestion,
    debateCompareBaselineQuestion,
    debateCompareFinalQuestion,
    debateSeriesRounds,
    leadersShown,
    winnersRowsCount,
    showEventTitleScreen,
    isTagCloudQuestion,
    isGeoPollQuestion,
    firstCorrectWinnersShown,
    showProjectorWinnersHero,
    fullScreenCloud,
    fullScreenContainer,
    barQuestionCentered,
  };
}

/** Раунды серии для компактных шкал под накопительным итогом. */
export function resolveDebateSeriesProjectorRounds(
  questions: ProjectorQuestionResult[],
  view: Pick<PublicViewState, "debateSeriesId" | "debateSeriesQuestionIds">,
): ProjectorQuestionResult[] {
  const seriesId = view.debateSeriesId?.trim();
  if (!seriesId) return [];

  const rounds = questions
    .filter((q) => q.debateSeriesId?.trim() === seriesId)
    .sort(
      (a, b) =>
        (a.debateRoundIndex ?? 0) - (b.debateRoundIndex ?? 0) ||
        a.questionId.localeCompare(b.questionId),
    );
  if (rounds.length === 0) return [];

  const includeIds = new Set(
    (view.debateSeriesQuestionIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0),
  );
  const filtered =
    includeIds.size > 0 ? rounds.filter((q) => includeIds.has(q.questionId)) : rounds;
  return filtered.length > 0 ? filtered : rounds;
}

/** Собирает вопрос серии для проектора: сумма голосов или один раунд. */
export function resolveDebateSeriesProjectorQuestion(
  questions: ProjectorQuestionResult[],
  view: Pick<
    PublicViewState,
    "debateSeriesId" | "debateSeriesView" | "debateSeriesQuestionIds" | "questionId"
  >,
): ProjectorQuestionResult | undefined {
  const seriesId = view.debateSeriesId?.trim();
  if (!seriesId) return undefined;

  const rounds = questions
    .filter((q) => q.debateSeriesId?.trim() === seriesId)
    .sort(
      (a, b) =>
        (a.debateRoundIndex ?? 0) - (b.debateRoundIndex ?? 0) ||
        a.questionId.localeCompare(b.questionId),
    );
  if (rounds.length === 0) return undefined;

  if (view.debateSeriesView === "round") {
    const byId = view.questionId ? rounds.find((q) => q.questionId === view.questionId) : undefined;
    return byId ?? rounds[rounds.length - 1];
  }

  const includeIds = new Set(
    (view.debateSeriesQuestionIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0),
  );
  const roundsToSum =
    includeIds.size > 0 ? rounds.filter((q) => includeIds.has(q.questionId)) : rounds;
  const effectiveRounds = roundsToSum.length > 0 ? roundsToSum : rounds;

  const last = effectiveRounds[effectiveRounds.length - 1]!;
  const summed = sumDebateSeriesOptionStats(
    effectiveRounds.map((q) =>
      q.optionStats.map((row) => ({
        optionId: row.optionId,
        text: row.text,
        count: row.count,
        imageUrl: row.imageUrl,
        color: row.color,
        isCorrect: row.isCorrect,
      })),
    ),
  );

  const seriesTitle = resolveDebateSeriesResultTitle(
    effectiveRounds.map((q) => q.debateSeriesResultTitle).find((t) => t?.trim()) ??
      last.debateSeriesResultTitle,
  );

  return {
    ...last,
    questionId: last.questionId,
    text: seriesTitle,
    projectorDebateLayout: true,
    debateSeriesId: seriesId,
    debateRoundIndex: last.debateRoundIndex,
    debateSeriesResultTitle: seriesTitle,
    optionStats: summed.map((row) => ({
      optionId: row.optionId,
      text: row.text,
      count: row.count,
      imageUrl: row.imageUrl,
      color: row.color,
      isCorrect: Boolean(row.isCorrect),
    })),
  };
}

function applyProjectorOptionVoteOverrides(
  question: ProjectorQuestionResult | undefined,
  view: PublicViewState,
): ProjectorQuestionResult | undefined {
  if (!question) return undefined;
  const manual = resolveTagCloudManualForQuestion(
    view.tagCloudManualByQuestionId,
    question.questionId,
  );
  if (manual.optionVoteCountOverrides.length === 0) return question;

  const optionStats = applyOptionVoteCountOverrides(
    question.optionStats,
    manual.optionVoteCountOverrides,
  );
  if (question.type !== "temperature") {
    return { ...question, optionStats };
  }

  const temperatureValue = computeTemperatureWeightedAverage(
    optionStats.map((row) => ({ count: row.count, weight: row.weight ?? 0 })),
  );
  return {
    ...question,
    optionStats,
    temperatureValue: temperatureValue ?? undefined,
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
