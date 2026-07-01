// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicReportPage } from "./PublicReportPage";

describe("PublicReportPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders published report blocks from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          title: "Демо событие",
          slug: "demo",
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
            reportTitle: "Отчет демо",
            reportModules: ["event_header", "participation_summary"],
            reportVoteQuestionIds: [],
            reportQuizQuestionIds: [],
            reportQuizSubQuizIds: [],
            reportPublished: true,
          },
          summary: {
            participantsCount: 10,
            questionsCount: 4,
            subQuizzesCount: 1,
            answersCount: 36,
          },
          leaderboard: [{ nickname: "Алиса", score: 15, totalResponseMs: 1500 }],
          quizQuestions: [],
          voteQuestions: [],
          randomizer: { currentWinners: [], history: [] },
          reactions: { overlayText: "", widgets: [] },
          speakerQuestions: { enabled: false, total: 0, onScreen: 0, items: [] },
          feedback: [],
          subQuizParticipantTables: [],
          banners: [],
        }),
      })),
    );

    render(
      <MemoryRouter initialEntries={["/report/demo"]}>
        <Routes>
          <Route path="/report/:slug" element={<PublicReportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Отчет демо")).toBeTruthy();
    expect(await screen.findByText("Итоги участия")).toBeTruthy();
  });

  it("renders banners block when module is enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          title: "Демо событие",
          slug: "demo",
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
            reportTitle: "Отчет демо",
            reportModules: ["banners_summary"],
            reportVoteQuestionIds: [],
            reportQuizQuestionIds: [],
            reportQuizSubQuizIds: [],
            reportPublished: true,
          },
          summary: {
            participantsCount: 10,
            questionsCount: 4,
            subQuizzesCount: 1,
            answersCount: 36,
          },
          leaderboard: [],
          quizQuestions: [],
          voteQuestions: [],
          randomizer: { currentWinners: [], history: [] },
          reactions: { overlayText: "", widgets: [] },
          speakerQuestions: { enabled: false, total: 0, onScreen: 0, items: [] },
          feedback: [],
          subQuizParticipantTables: [],
          banners: [
            {
              id: "b1",
              backgroundUrl: "/uploads/b1.png",
              linkUrl: "https://example.com",
              uniqueClicks: 5,
            },
          ],
        }),
      })),
    );

    render(
      <MemoryRouter initialEntries={["/report/demo"]}>
        <Routes>
          <Route path="/report/:slug" element={<PublicReportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Баннеры")).toBeTruthy();
    expect(await screen.findByText("https://example.com")).toBeTruthy();
    expect(await screen.findByText("5")).toBeTruthy();
  });
});
