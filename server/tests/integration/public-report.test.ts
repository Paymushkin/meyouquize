import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import {
  createRoom,
  getPublicReportBySlug,
  getRoomByEventName,
  replaceRoomContent,
  setQuestionEnabled,
  submitAnswer,
} from "../../src/quiz-service.js";
import { saveStoredPublicView } from "../../src/socket/public-view-store.js";
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
});
