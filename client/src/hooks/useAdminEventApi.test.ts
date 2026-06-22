// @vitest-environment jsdom

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAdminEventApi } from "./useAdminEventApi";

vi.mock("../config", () => ({ API_BASE: "http://test.local" }));

const { mockSocket } = vi.hoisted(() => ({
  mockSocket: { emit: vi.fn() },
}));

vi.mock("../socket", () => ({ socket: mockSocket }));

function makeParams() {
  return {
    eventName: "demo-room",
    lastSavedSnapshotRef: { current: "" },
    setIsAuth: vi.fn(),
    setRoom: vi.fn(),
    setQuizId: vi.fn(),
    setQuestionId: vi.fn(),
    setSubQuizSheets: vi.fn(),
    setQuestionForms: vi.fn(),
    setSelectedQuestionIndex: vi.fn(),
    setMessage: vi.fn(),
  };
}

describe("useAdminEventApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSocket.emit.mockClear();
  });

  it("checkSession sets auth flag from /api/admin/me", async () => {
    const params = makeParams();
    vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);

    const { result } = renderHook(() => useAdminEventApi(params));
    await act(async () => {
      await result.current.checkSession();
    });

    expect(params.setIsAuth).toHaveBeenCalledWith(true);
    expect(result.current.authChecked).toBe(true);
  });

  it("loadRoom hydrates admin state from API response", async () => {
    const params = makeParams();
    const room = {
      id: "room-id",
      slug: "demo-room",
      title: "Demo",
      subQuizzes: [{ id: "sq1", title: "Block", questionFlowMode: "MANUAL", sortOrder: 0 }],
      questions: [
        {
          id: "q1",
          text: "Q1",
          type: "SINGLE",
          order: 0,
          subQuizId: "sq1",
          options: [],
        },
      ],
    };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => room,
    } as Response);

    const { result } = renderHook(() => useAdminEventApi(params));
    await act(async () => {
      await result.current.loadRoom();
    });

    expect(params.setRoom).toHaveBeenCalledWith(room);
    expect(params.setQuizId).toHaveBeenCalledWith("room-id");
    expect(params.setSubQuizSheets).toHaveBeenCalled();
    expect(params.setQuestionForms).toHaveBeenCalled();
  });
});
