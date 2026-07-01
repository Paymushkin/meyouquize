import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import {
  createRoom,
  getPublicReportBySlug,
  getRoomByEventName,
  patchTagCloudManualByQuestionId,
  replaceRoomContent,
  setQuestionEnabled,
  submitAnswer,
} from "../../src/quiz-service.js";
import { saveStoredPublicView, getStoredPublicView } from "../../src/socket/public-view-store.js";
import { activateQuestion, joinPlayer, uniqueSlug } from "../helpers/integrationFixtures.js";

describe("public report", () => {
  it("returns null when report is not published", async () => {
    const slug = uniqueSlug("no-report");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    const report = await getPublicReportBySlug(slug);
    expect(report).toBeNull();
  });

  it("returns report payload when published", async () => {
    const slug = uniqueSlug("report-pub");
    await createRoom({ eventName: slug, title: `Public ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Main",
          sortOrder: 0,
          questions: [
            {
              text: "Q",
              type: "single",
              points: 5,
              scoringMode: "quiz",
              options: [
                { text: "OK", isCorrect: true },
                { text: "NO", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const okId = question.options.find((o) => o.text === "OK")!.id;
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Fan", "dev-rp");
    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: [okId],
      participantId: player.participantId,
    });

    await saveStoredPublicView(room!.id, {
      ...DEFAULT_PUBLIC_VIEW_STATE,
      reportPublished: true,
    });

    const report = await getPublicReportBySlug(slug);
    expect(report).not.toBeNull();
    expect(report?.title).toBe(`Public ${slug}`);
    expect(report?.summary.participantsCount).toBe(1);
    expect(report?.summary.answersCount).toBe(1);
    expect(report?.quizQuestions.length).toBeGreaterThan(0);
  });

  it("applies manual vote count overrides in report results", async () => {
    const slug = uniqueSlug("report-manual");
    await createRoom({ eventName: slug, title: `Manual ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [],
      standaloneQuestions: [
        {
          text: "Vote",
          type: "single",
          points: 0,
          scoringMode: "poll",
          options: [
            { text: "Да", isCorrect: false },
            { text: "Нет", isCorrect: false },
          ],
        },
      ],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const yesId = question.options.find((o) => o.text === "Да")!.id;
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Voter", "dev-rp-manual");
    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: [yesId],
      participantId: player.participantId,
    });

    await patchTagCloudManualByQuestionId(slug, {
      [question.id]: {
        hiddenTagTexts: [],
        injectedTagWords: [],
        tagCountOverrides: [],
        optionVoteCountOverrides: [{ text: yesId, count: 42 }],
      },
    });

    const storedBeforePublish = await getStoredPublicView(room!.id);
    await saveStoredPublicView(room!.id, {
      ...storedBeforePublish,
      reportPublished: true,
    });

    const report = await getPublicReportBySlug(slug);
    expect(report).not.toBeNull();
    const voteQuestion = report!.voteQuestions.find((row) => row.questionId === question.id);
    expect(voteQuestion?.optionStats.find((row) => row.optionId === yesId)?.count).toBe(42);
  });

  it("includes banner image, link and click stats in report", async () => {
    const slug = uniqueSlug("report-banners");
    await createRoom({ eventName: slug, title: `Banners ${slug}` });
    const room = await getRoomByEventName(slug);
    await saveStoredPublicView(room!.id, {
      ...DEFAULT_PUBLIC_VIEW_STATE,
      reportPublished: true,
      playerBanners: [
        {
          id: "banner-1",
          linkUrl: "https://example.com/offer",
          backgroundUrl: "/uploads/banner-1.png",
          size: "2x1",
          isVisible: true,
        },
      ],
      playerBannerClickStats: [{ bannerId: "banner-1", uniqueClicks: 7 }],
    });

    const report = await getPublicReportBySlug(slug);
    expect(report?.banners).toEqual([
      {
        id: "banner-1",
        backgroundUrl: "/uploads/banner-1.png",
        linkUrl: "https://example.com/offer",
        uniqueClicks: 7,
      },
    ]);
  });
});
