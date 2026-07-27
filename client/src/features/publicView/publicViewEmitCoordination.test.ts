import { afterEach, describe, expect, it, vi } from "vitest";
import {
  flushPublicViewSocketEmitForTests,
  publicViewPayloadKey,
  recordServerPublicView,
  resetPublicViewEmitCoordinationForTests,
  schedulePublicViewSocketEmit,
} from "./publicViewEmitCoordination";

describe("publicViewEmitCoordination", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetPublicViewEmitCoordinationForTests();
  });

  it("dedupes identical projector payload within window", () => {
    const fn = vi.fn();
    const key = publicViewPayloadKey({
      quizId: "q1",
      mode: "question",
      questionId: "a",
    });
    schedulePublicViewSocketEmit(fn, key);
    schedulePublicViewSocketEmit(fn, key);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("skips emit matching recent server echo", () => {
    const fn = vi.fn();
    const payload = { quizId: "q1", mode: "question", questionId: "a" };
    const key = publicViewPayloadKey(payload);
    recordServerPublicView(payload);
    schedulePublicViewSocketEmit(fn, key);
    expect(fn).not.toHaveBeenCalled();
  });

  it("debounces rapid distinct emits into one trailing call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    schedulePublicViewSocketEmit(fn, publicViewPayloadKey({ quizId: "q1", mode: "title" }));
    expect(fn).toHaveBeenCalledTimes(1);

    schedulePublicViewSocketEmit(
      fn,
      publicViewPayloadKey({ quizId: "q1", mode: "question", questionId: "b" }),
    );
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("flushPublicViewSocketEmitForTests runs pending debounced emit", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    schedulePublicViewSocketEmit(fn, publicViewPayloadKey({ quizId: "q1", mode: "title" }));
    schedulePublicViewSocketEmit(
      fn,
      publicViewPayloadKey({ quizId: "q1", mode: "question", questionId: "x" }),
    );
    flushPublicViewSocketEmitForTests();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("distinguishes branding toggles in payload key", () => {
    const on = publicViewPayloadKey({
      quizId: "q1",
      mode: "title",
      projectorJoinQrVisible: true,
    });
    const off = publicViewPayloadKey({
      quizId: "q1",
      mode: "title",
      projectorJoinQrVisible: false,
    });
    expect(on).not.toBe(off);
  });

  it("emits last branding toggle after rapid burst debounce", () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const onKey = publicViewPayloadKey({ quizId: "q1", projectorJoinQrVisible: true });
    const offKey = publicViewPayloadKey({ quizId: "q1", projectorJoinQrVisible: false });

    schedulePublicViewSocketEmit(() => calls.push("on"), onKey);
    expect(calls).toEqual(["on"]);

    schedulePublicViewSocketEmit(() => calls.push("off"), offKey);
    expect(calls).toEqual(["on"]);
    vi.advanceTimersByTime(120);
    expect(calls).toEqual(["on", "off"]);
  });
});
