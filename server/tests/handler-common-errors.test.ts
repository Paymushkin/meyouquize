import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { caughtErrorMessage } from "../src/socket/handler-common.js";
import { createSpeakerQuestionSchema } from "../src/schemas.js";

describe("caughtErrorMessage", () => {
  it("переводит too_small для text в понятное сообщение", () => {
    const parsed = createSpeakerQuestionSchema.safeParse({
      quizId: "q1",
      speakerName: "Иванов",
      text: "ab",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(caughtErrorMessage(parsed.error, "fallback")).toBe(
      "Текст вопроса должен быть не короче 3 символов",
    );
  });

  it("не отдаёт сырой JSON issues из Error.message", () => {
    const zodLike = new Error(
      JSON.stringify([{ code: "too_small", minimum: 3, type: "string", path: ["text"] }]),
    );
    expect(caughtErrorMessage(zodLike, "fallback")).toBe("Некорректные данные");
  });

  it("пробрасывает обычные Error.message", () => {
    expect(caughtErrorMessage(new Error("Not joined"), "fallback")).toBe("Not joined");
  });

  it("для ZodError без text/too_small берёт message issue", () => {
    const error = new ZodError([
      {
        code: "custom",
        path: ["speakerName"],
        message: "Спикер не найден",
      },
    ]);
    expect(caughtErrorMessage(error, "fallback")).toBe("Спикер не найден");
  });
});
