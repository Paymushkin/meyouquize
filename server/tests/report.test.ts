import { describe, expect, it } from "vitest";
import { setPublicViewSchema } from "../src/schemas.js";
import { renderPublicReportPdf } from "../src/report-pdf.js";
import type { PublicEventReport } from "../src/quiz-service.js";

describe("report contracts", () => {
  it("accepts report fields in setPublicViewSchema", () => {
    const parsed = setPublicViewSchema.safeParse({
      quizId: "quiz-1",
      mode: "report",
      reportTitle: "Финальный отчет",
      reportModules: ["event_header", "quiz_results", "vote_results"],
      reportVoteQuestionIds: ["q-1"],
      reportQuizQuestionIds: ["qq-1"],
      reportQuizSubQuizIds: ["sq-1"],
      reportPublished: true,
      reportRandomizerRunIds: ["current", "history:0"],
      reportReactionsWidgetIds: ["w1"],
      reportSpeakerQuestionIds: ["sq1"],
    });
    expect(parsed.success).toBe(true);
  });

  it("renders report PDF buffer", async () => {
    const report: PublicEventReport = {
      title: "Мой ивент",
      slug: "my-event",
      generatedAt: new Date().toISOString(),
      branding: {
        brandPrimaryColor: "#7c5acb",
        brandAccentColor: "#1976d2",
        brandSurfaceColor: "#ffffff",
        brandTextColor: "#1f1f1f",
        brandFontFamily: "Jost, Arial, sans-serif",
        brandLogoUrl: "",
        brandProjectorBackgroundImageUrl: "",
        brandBodyBackgroundColor: "#000000",
      },
      config: {
        reportTitle: "Отчет мероприятия",
        reportModules: ["event_header", "quiz_results", "vote_results"],
        reportVoteQuestionIds: ["q-vote-1"],
        reportQuizQuestionIds: ["q1"],
        reportQuizSubQuizIds: ["sq1"],
        reportPublished: true,
      },
      summary: {
        participantsCount: 42,
        questionsCount: 10,
        subQuizzesCount: 2,
        answersCount: 380,
      },
      leaderboard: [{ participantId: "p1", nickname: "Игрок", score: 120, totalResponseMs: 5000 }],
      quizQuestions: [
        {
          questionId: "q1",
          text: "Вопрос 1",
          subQuizId: "sq1",
          projectorShowFirstCorrect: false,
          projectorFirstCorrectWinnersCount: 1,
          type: "single",
          rankingProjectorMetric: undefined,
          rankingKind: undefined,
          optionStats: [{ optionId: "o1", text: "A", count: 10, isCorrect: true }],
          tagCloud: [],
          firstCorrectNicknames: [],
        },
      ],
      voteQuestions: [
        {
          questionId: "q-vote-1",
          text: "Голосование 1",
          subQuizId: null,
          projectorShowFirstCorrect: false,
          projectorFirstCorrectWinnersCount: 1,
          type: "single",
          rankingProjectorMetric: undefined,
          rankingKind: undefined,
          optionStats: [{ optionId: "o1", text: "Да", count: 7, isCorrect: false }],
          tagCloud: [],
          firstCorrectNicknames: [],
        },
      ],
      randomizer: {
        currentWinners: ["Анна"],
        history: [{ timestamp: "10:00", winners: ["Анна"], mode: "names" }],
      },
      reactions: {
        overlayText: "Реакции аудитории",
        widgets: [
          {
            id: "w1",
            title: "Эмоции",
            reactions: ["🔥", "👏"],
            reactionStats: [
              { reaction: "🔥", count: 3 },
              { reaction: "👏", count: 1 },
            ],
          },
        ],
      },
      speakerQuestions: {
        enabled: true,
        total: 5,
        onScreen: 2,
        items: [],
      },
      subQuizParticipantTables: [],
    };

    const buffer = await renderPublicReportPdf(report);
    expect(buffer.length).toBeGreaterThan(100);
  });
});
