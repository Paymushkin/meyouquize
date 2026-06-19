import { describe, expect, it } from "vitest";
import { QuizStatus } from "@prisma/client";
import {
  activateNextQuestion,
  closeQuestion,
  finishQuiz,
  getQuizPublicState,
  setQuestionEnabled,
} from "../../src/quiz-service.js";
import { seedSingleChoiceQuiz, uniqueSlug } from "../helpers/integrationFixtures.js";
import { createRoom, replaceRoomContent, getRoomByEventName } from "../../src/quiz-service.js";

describe("question control", () => {
  it("activates first question in sub-quiz", async () => {
    const { quizId, subQuizId, question } = await seedSingleChoiceQuiz(uniqueSlug("activate"));

    const state = await activateNextQuestion(quizId, subQuizId);
    expect(state?.status).toBe(QuizStatus.LIVE);
    expect(state?.activeQuestion?.id).toBe(question.id);

    const refreshed = await getQuizPublicState(quizId);
    expect(refreshed?.activeQuestion?.id).toBe(question.id);
  });

  it("closes question and advances sub-quiz index", async () => {
    const slug = uniqueSlug("close");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Block",
          sortOrder: 0,
          questions: [
            {
              text: "Q1",
              type: "single",
              points: 1,
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: false },
              ],
            },
            {
              text: "Q2",
              type: "single",
              points: 1,
              options: [
                { text: "C", isCorrect: true },
                { text: "D", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const q1 = room!.questions.find((q) => q.text === "Q1")!;
    await activateNextQuestion(room!.id, room!.subQuizzes[0]!.id);

    await closeQuestion(room!.id, q1.id);

    const q1Row = await getRoomByEventName(slug);
    const closed = q1Row!.questions.find((q) => q.id === q1.id);
    expect(closed?.isClosed).toBe(true);
    expect(closed?.isActive).toBe(false);
    expect(q1Row!.subQuizzes[0]?.currentQuestionIndex).toBe(1);
  });

  it("toggles standalone vote question on and off", async () => {
    const slug = uniqueSlug("toggle");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [],
      standaloneQuestions: [
        {
          text: "Vote",
          type: "single",
          points: 0,
          scoringMode: "poll",
          options: [
            { text: "Yes", isCorrect: false },
            { text: "No", isCorrect: false },
          ],
        },
      ],
    });
    const room = await getRoomByEventName(slug);
    const vote = room!.questions[0]!;

    const onState = await setQuestionEnabled(room!.id, vote.id, true);
    expect(onState?.activeQuestion?.id).toBe(vote.id);

    const offState = await setQuestionEnabled(room!.id, vote.id, false);
    expect(offState?.activeQuestion).toBeNull();
  });

  it("finishes quiz and deactivates open questions", async () => {
    const { quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("finish"));
    await setQuestionEnabled(quizId, question.id, true);

    const state = await finishQuiz(quizId);
    expect(state?.status).toBe(QuizStatus.FINISHED);
    expect(state?.activeQuestion).toBeNull();
  });
});
