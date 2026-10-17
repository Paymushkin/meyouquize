import { describe, expect, it } from "vitest";
import { buildQuizPlayConnectionChip, quizPlayConnectionDotColor } from "./connectionChip";

describe("buildQuizPlayConnectionChip", () => {
  it("maps connection states to indicator tones", () => {
    expect(buildQuizPlayConnectionChip("online", true)).toEqual({
      tone: "online",
      label: "Онлайн",
    });
    expect(buildQuizPlayConnectionChip("reconnecting", true)).toEqual({
      tone: "reconnecting",
      label: "Переподключение",
    });
    expect(buildQuizPlayConnectionChip("offline", true)).toEqual({
      tone: "offline",
      label: "Нет соединения",
    });
  });

  it("treats unready session as reconnecting unless offline", () => {
    expect(buildQuizPlayConnectionChip("online", false).tone).toBe("reconnecting");
    expect(buildQuizPlayConnectionChip("offline", false).tone).toBe("offline");
  });
});

describe("quizPlayConnectionDotColor", () => {
  it("returns green yellow or red", () => {
    expect(quizPlayConnectionDotColor("online")).toBe("#2e7d32");
    expect(quizPlayConnectionDotColor("reconnecting")).toBe("#f9a825");
    expect(quizPlayConnectionDotColor("offline")).toBe("#c62828");
  });
});
