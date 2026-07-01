import { describe, expect, it } from "vitest";
import { buildReportPdfHtml } from "../src/report-pdf-html.js";
import type { PublicEventReport } from "../src/quiz-service.js";

const baseReport: PublicEventReport = {
  title: "Демо",
  slug: "demo",
  generatedAt: new Date().toISOString(),
  branding: {
    brandPrimaryColor: "#7c5acb",
    brandAccentColor: "#1976d2",
    brandSurfaceColor: "#1a2634",
    brandTextColor: "#ffffff",
    brandFontFamily: "Roboto, sans-serif",
    brandFontUrl: "",
    brandLogoUrl: "",
    brandProjectorBackgroundImageUrl: "",
    brandBodyBackgroundColor: "#0f1d2a",
  },
  config: {
    reportTitle: "Отчёт",
    reportModules: ["event_header", "vote_results"],
    reportVoteQuestionIds: [],
    reportQuizQuestionIds: [],
    reportQuizSubQuizIds: [],
    reportFeedbackFormIds: [],
    reportSpeakerQuestionIds: [],
    reportPublished: true,
  },
  summary: {
    participantsCount: 10,
    questionsCount: 2,
    subQuizzesCount: 1,
    answersCount: 20,
  },
  leaderboard: [],
  quizQuestions: [],
  voteQuestions: [
    {
      questionId: "q1",
      text: "Как вам?",
      subQuizId: null,
      type: "single",
      optionStats: [
        { optionId: "o1", text: "Хорошо", count: 7, isCorrect: false },
        { optionId: "o2", text: "Отлично", count: 3, isCorrect: false },
      ],
      tagCloud: [],
      firstCorrectNicknames: [],
      projectorShowFirstCorrect: false,
      projectorFirstCorrectWinnersCount: 1,
    },
  ],
  randomizer: { currentWinners: [], history: [] },
  reactions: { overlayText: "", widgets: [] },
  speakerQuestions: { enabled: false, total: 0, onScreen: 0, items: [] },
  feedback: [],
  subQuizParticipantTables: [],
  banners: [],
};

describe("buildReportPdfHtml", () => {
  it("embeds branding colors and cyrillic text", () => {
    const html = buildReportPdfHtml(baseReport);
    expect(html).toContain("#7c5acb");
    expect(html).toContain("#0f1d2a");
    expect(html).toContain("Отчёт");
    expect(html).toContain("Хорошо");
    expect(html).toContain('data-report-pdf-ready="1"');
  });

  it("renders banners section with image, link and clicks", () => {
    const html = buildReportPdfHtml({
      ...baseReport,
      config: {
        ...baseReport.config,
        reportModules: ["banners_summary"],
      },
      banners: [
        {
          id: "b1",
          backgroundUrl: "/uploads/banner.png",
          linkUrl: "https://example.com/promo",
          uniqueClicks: 12,
        },
      ],
    });
    expect(html).toContain("Баннеры");
    expect(html).toContain("https://example.com/promo");
    expect(html).toContain("/uploads/banner.png");
    expect(html).toContain(">12<");
  });
});
