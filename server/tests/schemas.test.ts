import { describe, expect, it } from "vitest";
import {
  adminAuthSchema,
  joinQuizSchema,
  replaceRoomContentSchema,
  submitAnswerSchema,
} from "../src/schemas.js";

const baseQuestion = {
  text: "",
  type: "single" as const,
  points: 1,
  options: [
    { text: "", isCorrect: true, imageUrl: "/media/a.png" },
    { text: "B", isCorrect: false },
  ],
};

describe("replaceRoomContentSchema question images", () => {
  it("accepts question with image only", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [
        {
          title: "Квиз",
          sortOrder: 0,
          questions: [
            {
              ...baseQuestion,
              imageUrl: "/media/q.png",
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
    expect(parsed.success).toBe(true);
  });

  it("accepts option with image only", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [
        {
          title: "Квиз",
          sortOrder: 0,
          questions: [
            {
              text: "Выберите",
              type: "single",
              points: 1,
              options: [
                { text: "", isCorrect: true, imageUrl: "/media/a.png" },
                { text: "", isCorrect: false, imageUrl: "/media/b.png" },
              ],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects question without text and image", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [
        {
          title: "Квиз",
          sortOrder: 0,
          questions: [
            {
              text: "",
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
      standaloneQuestions: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects tag_cloud option images", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [
        {
          title: "Квиз",
          sortOrder: 0,
          questions: [
            {
              text: "Теги",
              type: "tag_cloud",
              points: 1,
              maxAnswers: 3,
              options: [{ text: "синий", isCorrect: true, imageUrl: "/media/x.png" }],
            },
          ],
        },
      ],
      standaloneQuestions: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid asset URL", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [
        {
          title: "Квиз",
          sortOrder: 0,
          questions: [
            {
              text: "Q",
              type: "single",
              points: 1,
              imageUrl: "javascript:alert(1)",
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
    expect(parsed.success).toBe(false);
  });
});

describe("replaceRoomContentSchema temperature", () => {
  const validTemperature = {
    text: "Насколько вам понравилось?",
    type: "temperature" as const,
    points: 1,
    options: [
      { text: "Холодно", isCorrect: false, weight: 25 },
      { text: "Тепло", isCorrect: false, weight: 75 },
    ],
  };

  it("accepts valid temperature question with weights", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [],
      standaloneQuestions: [validTemperature],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects temperature option without weight", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [],
      standaloneQuestions: [
        {
          ...validTemperature,
          options: [
            { text: "A", isCorrect: false, weight: 25 },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects weight above 100", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [],
      standaloneQuestions: [
        {
          ...validTemperature,
          options: [
            { text: "A", isCorrect: false, weight: 25 },
            { text: "B", isCorrect: false, weight: 101 },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("joinQuizSchema", () => {
  it("accepts valid join payload", () => {
    const parsed = joinQuizSchema.safeParse({
      slug: "demo",
      nickname: "Player",
      deviceId: "device-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty nickname", () => {
    expect(joinQuizSchema.safeParse({ slug: "demo", nickname: "", deviceId: "d1" }).success).toBe(
      false,
    );
  });
});

describe("submitAnswerSchema", () => {
  it("accepts single option answer", () => {
    expect(
      submitAnswerSchema.safeParse({
        quizId: "q1",
        questionId: "question-1",
        optionIds: ["opt-1"],
      }).success,
    ).toBe(true);
  });

  it("accepts ranking and tag cloud payloads", () => {
    expect(
      submitAnswerSchema.safeParse({
        quizId: "q1",
        questionId: "question-1",
        rankedOptionIds: ["a", "b", "c"],
      }).success,
    ).toBe(true);
    expect(
      submitAnswerSchema.safeParse({
        quizId: "q1",
        questionId: "question-1",
        tagAnswers: ["синий", "голубой"],
      }).success,
    ).toBe(true);
  });

  it("rejects too many tag answers", () => {
    expect(
      submitAnswerSchema.safeParse({
        quizId: "q1",
        questionId: "question-1",
        tagAnswers: ["1", "2", "3", "4", "5", "6"],
      }).success,
    ).toBe(false);
  });
});

describe("adminAuthSchema", () => {
  it("requires login and password", () => {
    expect(adminAuthSchema.safeParse({ login: "admin", password: "secret" }).success).toBe(true);
    expect(adminAuthSchema.safeParse({ login: "", password: "x" }).success).toBe(false);
  });
});

describe("replaceRoomContentSchema ranking", () => {
  it("rejects ranking with fewer than three options", () => {
    const parsed = replaceRoomContentSchema.safeParse({
      subQuizzes: [],
      standaloneQuestions: [
        {
          text: "Rank",
          type: "ranking",
          points: 1,
          options: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
