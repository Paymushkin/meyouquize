import { describe, expect, it } from "vitest";
import { prisma } from "../../src/prisma.js";
import {
  createRoom,
  getRoomByEventName,
  replaceRoomContent,
  setQuestionEnabled,
  submitAnswer,
} from "../../src/quiz-service.js";
import { activateQuestion, joinPlayer, uniqueSlug } from "../helpers/integrationFixtures.js";

describe("submitAnswer", () => {
  it("scores single-choice quiz question correctly", async () => {
    const slug = uniqueSlug("single");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz",
          sortOrder: 0,
          questions: [
            {
              text: "2+2?",
              type: "single",
              points: 5,
              scoringMode: "quiz",
              options: [
                { text: "4", isCorrect: true },
                { text: "5", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const correctId = question.options.find((o) => o.text === "4")!.id;
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Alice", "dev-1");

    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: [correctId],
      participantId: player.participantId,
    });

    const answer = await prisma.answer.findFirst({
      where: { questionId: question.id, participantId: player.participantId },
    });
    expect(answer?.isCorrect).toBe(true);
    expect(answer?.scoreAwarded).toBe(5);
  });

  it("does not award points in poll scoring mode", async () => {
    const slug = uniqueSlug("poll");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [],
      standaloneQuestions: [
        {
          text: "Favorite color?",
          type: "single",
          points: 10,
          scoringMode: "poll",
          options: [
            { text: "Red", isCorrect: true },
            { text: "Blue", isCorrect: false },
          ],
        },
      ],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const redId = question.options.find((o) => o.text === "Red")!.id;
    await setQuestionEnabled(room!.id, question.id, true);
    const player = await joinPlayer(slug, "Bob", "dev-2");

    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: [redId],
      participantId: player.participantId,
    });

    const answer = await prisma.answer.findFirst({
      where: { questionId: question.id, participantId: player.participantId },
    });
    expect(answer?.scoreAwarded).toBe(0);
  });

  it("accepts multi-select when all correct options chosen", async () => {
    const slug = uniqueSlug("multi");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz",
          sortOrder: 0,
          questions: [
            {
              text: "Pick fruits",
              type: "multi",
              points: 3,
              scoringMode: "quiz",
              options: [
                { text: "Apple", isCorrect: true },
                { text: "Car", isCorrect: false },
                { text: "Banana", isCorrect: true },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const ids = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Carol", "dev-3");

    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: ids,
      participantId: player.participantId,
    });

    const answer = await prisma.answer.findFirst({
      where: { questionId: question.id, participantId: player.participantId },
    });
    expect(answer?.isCorrect).toBe(true);
    expect(answer?.scoreAwarded).toBe(3);
  });

  it("stores tag cloud answers", async () => {
    const slug = uniqueSlug("tags");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz",
          sortOrder: 0,
          questions: [
            {
              text: "Tags",
              type: "tag_cloud",
              points: 2,
              maxAnswers: 3,
              scoringMode: "quiz",
              options: [{ text: "alpha", isCorrect: true }],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Dan", "dev-4");

    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      tagAnswers: ["alpha"],
      participantId: player.participantId,
    });

    const answer = await prisma.answer.findFirst({
      where: { questionId: question.id, participantId: player.participantId },
    });
    expect(answer).toBeTruthy();
    expect(JSON.parse(answer!.selectedOptionIds)).toContain("alpha");
  });

  it("caps responseMs when question was activated longer than INT4 can store", async () => {
    const slug = uniqueSlug("stale-activation");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz",
          sortOrder: 0,
          questions: [
            {
              text: "Stale",
              type: "single",
              points: 1,
              scoringMode: "quiz",
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const aId = question.options.find((o) => o.text === "A")!.id;
    await activateQuestion(room!.id, question.id);
    await prisma.question.update({
      where: { id: question.id },
      data: { activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    const player = await joinPlayer(slug, "Frank", "dev-stale");

    await submitAnswer({
      quizId: room!.id,
      questionId: question.id,
      optionIds: [aId],
      participantId: player.participantId,
    });

    const answer = await prisma.answer.findFirst({
      where: { questionId: question.id, participantId: player.participantId },
    });
    expect(answer?.responseMs).toBe(2_147_483_647);
  });

  it("rejects duplicate submission for the same question", async () => {
    const slug = uniqueSlug("dup-answer");
    await createRoom({ eventName: slug, title: `Room ${slug}` });
    await replaceRoomContent(slug, {
      subQuizzes: [
        {
          title: "Quiz",
          sortOrder: 0,
          questions: [
            {
              text: "One",
              type: "single",
              points: 1,
              scoringMode: "quiz",
              options: [
                { text: "A", isCorrect: true },
                { text: "B", isCorrect: false },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    const room = await getRoomByEventName(slug);
    const question = room!.questions[0]!;
    const aId = question.options.find((o) => o.text === "A")!.id;
    await activateQuestion(room!.id, question.id);
    const player = await joinPlayer(slug, "Eve", "dev-5");
    const payload = {
      quizId: room!.id,
      questionId: question.id,
      optionIds: [aId],
      participantId: player.participantId,
    };

    await submitAnswer(payload);
    await expect(submitAnswer(payload)).rejects.toThrow("Already answered this question");
  });
});
