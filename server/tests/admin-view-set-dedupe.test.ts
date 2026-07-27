import { describe, expect, it } from "vitest";
import {
  adminViewSetDedupeKey,
  shouldSkipAdminViewSetDedupe,
  VIEW_SET_DEDUPE_MS,
} from "../src/socket/admin-view-set-dedupe.js";

describe("admin-view-set-dedupe", () => {
  const payload = {
    quizId: "quiz-1",
    mode: "question",
    questionId: "q-1",
    questionRevealStage: "options",
    showFirstCorrectAnswerer: false,
  };

  it("builds stable key for identical projector patches", () => {
    const a = adminViewSetDedupeKey(payload);
    const b = adminViewSetDedupeKey({ ...payload });
    expect(a).toBe(b);
  });

  it("skips duplicate view:set within dedupe window", () => {
    const key = adminViewSetDedupeKey(payload);
    const now = 1_000_000;
    const prev = { key, at: now - 100 };
    expect(shouldSkipAdminViewSetDedupe(prev, key, now)).toBe(true);
  });

  it("allows same patch after dedupe window", () => {
    const key = adminViewSetDedupeKey(payload);
    const now = 2_000_000;
    const prev = { key, at: now - VIEW_SET_DEDUPE_MS };
    expect(shouldSkipAdminViewSetDedupe(prev, key, now)).toBe(false);
  });

  it("does not skip when mode changes", () => {
    const keyA = adminViewSetDedupeKey(payload);
    const keyB = adminViewSetDedupeKey({ ...payload, mode: "title", questionId: undefined });
    const now = 3_000_000;
    const prev = { key: keyA, at: now - 50 };
    expect(shouldSkipAdminViewSetDedupe(prev, keyB, now)).toBe(false);
  });

  it("does not skip when branding toggle differs with same projector mode", () => {
    const keyOn = adminViewSetDedupeKey({ ...payload, projectorJoinQrVisible: true });
    const keyOff = adminViewSetDedupeKey({ ...payload, projectorJoinQrVisible: false });
    expect(keyOn).not.toBe(keyOff);
    const now = 4_000_000;
    const prev = { key: keyOn, at: now - 50 };
    expect(shouldSkipAdminViewSetDedupe(prev, keyOff, now)).toBe(false);
  });
});
