import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { setPublicViewSchema } from "../src/schemas.js";
import { renderPublicReportPdf, resolveReportPdfPageOrigin } from "../src/report-pdf.js";
import type { PublicEventReport } from "../src/quiz-service.js";
import { makeReportConfig, makeReportPerQuestion } from "./helpers/reportFixtures.js";

describe("report contracts", () => {
  it("resolves pdf page origin from forwarded headers", () => {
    const origin = resolveReportPdfPageOrigin(
      {
        get(name: string) {
          if (name === "x-forwarded-host") return "meyou.site";
          if (name === "x-forwarded-proto") return "https";
          return undefined;
        },
        secure: true,
      } as Pick<Request, "get" | "secure">,
      ["http://localhost:5173"],
    );
    expect(origin).toBe("https://meyou.site");
  });

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
      reportFeedbackFormIds: ["f1", "f2"],
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
        brandFontUrl: "",
        brandLogoUrl: "",
        brandProjectorBackgroundImageUrl: "",
        brandBodyBackgroundColor: "#000000",
      },
      config: makeReportConfig({
        reportTitle: "Отчет мероприятия",
        reportModules: ["event_header", "quiz_results", "vote_results"],
        reportVoteQuestionIds: ["q-vote-1"],
        reportQuizQuestionIds: ["q1"],
        reportQuizSubQuizIds: ["sq1"],
        reportFeedbackFormIds: ["f1"],
      }),
      summary: {
        participantsCount: 42,
        questionsCount: 10,
        subQuizzesCount: 2,
        answersCount: 380,
      },
      leaderboard: [{ participantId: "p1", nickname: "Игрок", score: 120, totalResponseMs: 5000 }],
      quizQuestions: [
        makeReportPerQuestion({
          questionId: "q1",
          text: "Вопрос 1",
          subQuizId: "sq1",
          optionStats: [{ optionId: "o1", text: "A", count: 10, isCorrect: true }],
          answerCount: 10,
        }),
      ],
      voteQuestions: [
        makeReportPerQuestion({
          questionId: "q-vote-1",
          text: "Голосование 1",
          optionStats: [{ optionId: "o1", text: "Да", count: 7, isCorrect: false }],
          answerCount: 7,
        }),
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
      feedback: [
        {
          formId: "f1",
          title: "Обратная связь",
          responseCount: 2,
          openFields: [{ id: "f1-open", label: "Комментарий", placeholder: "Ваш комментарий" }],
          scaleStats: [
            {
              scaleId: "s1",
              label: "Как вам мероприятие?",
              options: ["😞", "😐", "🙂", "😊", "🤩"],
              counts: [0, 0, 1, 1, 0],
              average: 3.5,
              responseCount: 2,
            },
          ],
          responses: [
            {
              nickname: "Анна",
              scaleAnswers: { s1: 3 },
              openFieldAnswers: { "f1-open": "Отлично!" },
              comment: "Отлично!",
              submittedAt: new Date().toISOString(),
            },
          ],
        },
        {
          formId: "f2",
          title: "После перерыва",
          responseCount: 1,
          openFields: [],
          scaleStats: [
            {
              scaleId: "s2",
              label: "Оценка спикера",
              options: ["😞", "😐", "🙂", "😊", "🤩"],
              counts: [0, 0, 0, 1, 0],
              average: 4,
              responseCount: 1,
            },
          ],
          responses: [
            {
              nickname: "Борис",
              scaleAnswers: { s2: 3 },
              openFieldAnswers: {},
              comment: null,
              submittedAt: new Date().toISOString(),
            },
          ],
        },
      ],
      subQuizParticipantTables: [],
      banners: [],
    };

    const buffer = await renderPublicReportPdf(report);
    expect(buffer.length).toBeGreaterThan(100);
  });
});
