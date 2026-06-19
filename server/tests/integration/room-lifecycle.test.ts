import { describe, expect, it } from "vitest";
import {
  createRoom,
  getRoomByEventName,
  patchQuestionAdminDone,
  replaceRoomContent,
  updateRoomTitle,
} from "../../src/quiz-service.js";

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

describe("room lifecycle", () => {
  it("creates room and replaces content with temperature question", async () => {
    const slug = uniqueSlug("lifecycle");
    await createRoom({ eventName: slug, title: `Room ${slug}` });

    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Квиз 1",
          sortOrder: 0,
          questions: [
            {
              text: "Single Q",
              type: "single",
              points: 1,
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [
        {
          text: "Temperature vote",
          type: "temperature",
          temperatureSubtitle: "Уровень тревоги",
          points: 1,
          options: [
            { text: "Low", isCorrect: false, weight: 0 },
            { text: "High", isCorrect: false, weight: 100 },
          ],
        },
      ],
    });

    const room = await getRoomByEventName(slug);
    expect(room?.subQuizzes).toHaveLength(1);
    expect(room?.questions).toHaveLength(2);

    const temperature = room?.questions.find((q) => q.type === "TEMPERATURE");
    expect(temperature?.temperatureSubtitle).toBe("Уровень тревоги");
    expect(temperature?.options).toHaveLength(2);
  });

  it("updates room title and question adminDone flag", async () => {
    const slug = uniqueSlug("patch");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [],
      standaloneQuestions: [
        {
          text: "Vote",
          type: "single",
          points: 1,
          options: [
            { text: "A", isCorrect: true },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });

    const room = await getRoomByEventName(slug);
    const questionId = room?.questions[0]?.id;
    expect(questionId).toBeTruthy();

    await updateRoomTitle(slug, `Updated ${slug}`);
    await patchQuestionAdminDone(slug, questionId!, true);

    const updated = await getRoomByEventName(slug);
    expect(updated?.title).toBe(`Updated ${slug}`);
    expect(updated?.questions[0]?.adminDone).toBe(true);
  });
});
