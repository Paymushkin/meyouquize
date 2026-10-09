import { afterEach, describe, expect, it, vi } from "vitest";
import {
  recordServerPublicView,
  resetPublicViewEmitCoordinationForTests,
} from "./publicViewEmitCoordination";

const emitMock = vi.fn();

vi.mock("../../socket", () => ({
  socket: {
    emit: (...args: unknown[]) => emitMock(...args),
  },
}));

import {
  emitAdminPublicViewPatch,
  emitAdminPublicViewPatchNow,
  emitAdminPublicViewSet,
} from "./emitAdminPublicViewSet";
import { schedulePublicViewSocketEmit } from "./publicViewEmitCoordination";

describe("emitAdminPublicViewSet", () => {
  afterEach(() => {
    emitMock.mockClear();
    resetPublicViewEmitCoordinationForTests();
  });

  it("flushes pending debounce and emits report settings immediately", () => {
    vi.useFakeTimers();
    schedulePublicViewSocketEmit(
      () => {
        emitMock("pending");
      },
      JSON.stringify({ mode: "title" }),
    );
    // First emit runs immediately; second within burst window is debounced.
    schedulePublicViewSocketEmit(
      () => {
        emitMock("pending-debounced");
      },
      JSON.stringify({ mode: "question", questionId: "x" }),
    );
    expect(emitMock).toHaveBeenCalledTimes(1);

    emitAdminPublicViewPatchNow({
      quizId: "q1",
      reportModules: ["event_header", "quiz_results"],
    });
    expect(emitMock).toHaveBeenCalledWith("pending-debounced");
    expect(emitMock).toHaveBeenCalledWith("admin:results:view:set", {
      quizId: "q1",
      reportModules: ["event_header", "quiz_results"],
    });
    vi.useRealTimers();
  });

  it("routes report-only patches through immediate emit", () => {
    vi.useFakeTimers();
    schedulePublicViewSocketEmit(
      () => {
        emitMock("pending-debounced");
      },
      JSON.stringify({ mode: "title" }),
    );
    schedulePublicViewSocketEmit(
      () => {
        emitMock("pending-debounced-2");
      },
      JSON.stringify({ mode: "question", questionId: "y" }),
    );

    emitAdminPublicViewPatch({
      quizId: "q1",
      reportPublished: true,
    });
    expect(emitMock).toHaveBeenCalledWith("admin:results:view:set", {
      quizId: "q1",
      reportPublished: true,
    });
    vi.useRealTimers();
  });

  it("does not re-emit when server echo matches payload (breaks client ping-pong)", () => {
    const payload = {
      quizId: "q1",
      mode: "question",
      questionId: "a",
      showFirstCorrectAnswerer: false,
    };
    recordServerPublicView(payload);
    emitAdminPublicViewSet(payload);
    expect(emitMock).not.toHaveBeenCalled();
  });

  it("dedupes identical admin emits before socket", () => {
    const payload = { quizId: "q1", mode: "title", showFirstCorrectAnswerer: false };
    emitAdminPublicViewSet(payload);
    emitAdminPublicViewSet(payload);
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock).toHaveBeenCalledWith("admin:results:view:set", payload);
  });

  it("emits after server echo window when user changes mode again", () => {
    vi.useFakeTimers();
    const title = { quizId: "q1", mode: "title", showFirstCorrectAnswerer: false };
    const question = {
      quizId: "q1",
      mode: "question",
      questionId: "b",
      showFirstCorrectAnswerer: false,
    };

    emitAdminPublicViewSet(title);
    recordServerPublicView(title);
    emitAdminPublicViewSet(title);
    expect(emitMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2600);
    emitAdminPublicViewSet(question);
    expect(emitMock).toHaveBeenCalledTimes(2);
    expect(emitMock).toHaveBeenLastCalledWith("admin:results:view:set", question);
    vi.useRealTimers();
  });
});
