import { describe, expect, it } from "vitest";
import { assertNoProfanity, assertNoProfanityInTags, containsProfanity } from "../src/profanity.js";

describe("containsProfanity", () => {
  it("returns false for clean text", () => {
    expect(containsProfanity("Привет, это нормальный текст")).toBe(false);
  });

  it("detects dictionary word as separate lexeme", () => {
    expect(containsProfanity("ты мудак")).toBe(true);
  });

  it("does not match profanity inside another word", () => {
    expect(containsProfanity("супермудакология")).toBe(false);
  });

  it("normalizes ё and case", () => {
    expect(containsProfanity("ГОВНО")).toBe(true);
  });
});

describe("assertNoProfanity", () => {
  it("throws for profane text", () => {
    expect(() => assertNoProfanity("нахрен")).toThrow("недопустимые выражения");
  });

  it("passes for clean text", () => {
    expect(() => assertNoProfanity("Спасибо")).not.toThrow();
  });
});

describe("assertNoProfanityInTags", () => {
  it("checks each tag", () => {
    expect(() => assertNoProfanityInTags(["ok", "нахрен"])).toThrow();
    expect(() => assertNoProfanityInTags(["alpha", "beta"])).not.toThrow();
  });

  it("ignores empty tag list", () => {
    expect(() => assertNoProfanityInTags(undefined)).not.toThrow();
  });
});
