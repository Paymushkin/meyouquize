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

import { emitAdminPublicViewSet } from "./emitAdminPublicViewSet";

describe("emitAdminPublicViewSet", () => {
  afterEach(() => {
    emitMock.mockClear();
    resetPublicViewEmitCoordinationForTests();
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
