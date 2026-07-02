import { describe, expect, it } from "vitest";
import { buildReportPdfHtml } from "../src/report-pdf-html.js";
import type { PublicEventReport } from "../src/quiz-service.js";
import { makeReportConfig, makeReportPerQuestion } from "./helpers/reportFixtures.js";

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
  config: makeReportConfig({
    reportTitle: "Отчёт",
    reportModules: ["event_header", "vote_results"],
  }),
  summary: {
    participantsCount: 10,
    questionsCount: 2,
    subQuizzesCount: 1,
    answersCount: 20,
  },
  leaderboard: [],
  quizQuestions: [],
  voteQuestions: [
    makeReportPerQuestion({
      questionId: "q1",
      text: "Как вам?",
      optionStats: [
        { optionId: "o1", text: "Хорошо", count: 7, isCorrect: false },
        { optionId: "o2", text: "Отлично", count: 3, isCorrect: false },
      ],
      answerCount: 10,
    }),
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

  it("renders vote distribution with fractional percents", () => {
    const html = buildReportPdfHtml({
      ...baseReport,
      voteQuestions: [
        {
          ...baseReport.voteQuestions[0]!,
          optionStats: [
            { optionId: "o1", text: "A", count: 1, isCorrect: false },
            { optionId: "o2", text: "B", count: 2, isCorrect: false },
          ],
          answerCount: 3,
        },
      ],
    });
    expect(html).toContain("33,3%");
    expect(html).toContain("66,7%");
  });

  it("renders temperature vote with weighted average", () => {
    const html = buildReportPdfHtml({
      ...baseReport,
      voteQuestions: [
        makeReportPerQuestion({
          questionId: "temp-1",
          text: "Уровень вовлечённости",
          type: "temperature",
          temperatureSubtitle: "Температура",
          temperatureValue: 75,
          optionStats: [
            { optionId: "o1", text: "Холодно", count: 1, isCorrect: false, weight: 0 },
            { optionId: "o2", text: "Жарко", count: 3, isCorrect: false, weight: 100 },
          ],
          answerCount: 4,
        }),
      ],
    });
    expect(html).toContain("Температура: 75 / 100");
    expect(html).toContain("Холодно");
  });

  it("renders banners section with image, link and clicks", () => {
    const html = buildReportPdfHtml({
      ...baseReport,
      config: makeReportConfig({
        ...baseReport.config,
        reportModules: ["banners_summary"],
      }),
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
