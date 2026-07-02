import type { PublicEventReport } from "../../src/quiz-service.js";

type ReportPerQuestion = PublicEventReport["voteQuestions"][number];

export function makeReportPerQuestion(
  overrides: Partial<ReportPerQuestion> & Pick<ReportPerQuestion, "questionId" | "text">,
): ReportPerQuestion {
  return {
    imageUrl: undefined,
    subQuizId: null,
    projectorShowFirstCorrect: false,
    projectorFirstCorrectWinnersCount: 1,
    type: "single",
    rankingProjectorMetric: undefined,
    rankingKind: undefined,
    temperatureSubtitle: undefined,
    optionStats: [],
    tagCloud: [],
    answerCount: 0,
    firstCorrectNicknames: [],
    ...overrides,
  };
}

export function makeReportConfig(
  overrides: Partial<PublicEventReport["config"]> = {},
): PublicEventReport["config"] {
  return {
    reportTitle: "Отчёт",
    reportModules: ["event_header"],
    reportVoteQuestionIds: [],
    reportQuizQuestionIds: [],
    reportQuizSubQuizIds: [],
    reportFeedbackFormIds: [],
    reportSpeakerQuestionIds: [],
    reportPublished: true,
    ...overrides,
  };
}
