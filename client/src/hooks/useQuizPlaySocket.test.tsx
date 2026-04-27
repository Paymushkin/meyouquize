// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useQuizPlaySocket } from "./useQuizPlaySocket";

type Handler = (...args: any[]) => void;

const { handlers, mockSocket } = vi.hoisted(() => {
  const hoistedHandlers = new Map<string, Set<Handler>>();
  const hoistedSocket = {
    connected: false,
    connect: vi.fn(() => {
      hoistedSocket.connected = true;
    }),
    on: vi.fn((event: string, cb: Handler) => {
      const set = hoistedHandlers.get(event) ?? new Set<Handler>();
      set.add(cb);
      hoistedHandlers.set(event, set);
    }),
    off: vi.fn((event: string, cb: Handler) => {
      const set = hoistedHandlers.get(event);
      if (!set) return;
      set.delete(cb);
    }),
    emit: vi.fn(),
  };
  return { handlers: hoistedHandlers, mockSocket: hoistedSocket };
});

vi.mock("../socket", () => ({
  socket: mockSocket,
}));

function fireSocketEvent(event: string, payload?: unknown) {
  const set = handlers.get(event);
  if (!set) return;
  for (const cb of set) cb(payload);
}

function TestHarness(params: Parameters<typeof useQuizPlaySocket>[0]) {
  useQuizPlaySocket(params);
  return null;
}

describe("useQuizPlaySocket", () => {
  beforeEach(() => {
    handlers.clear();
    mockSocket.connected = false;
    mockSocket.connect.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it("hydrates submitted answers on player:answers", () => {
    const setQuiz = vi.fn();
    const setSelected = vi.fn();
    const setRankOrder = vi.fn();
    const setTagAnswers = vi.fn();
    const setSubmittedAnswers = vi.fn();
    const setSubmittedQuestionIds = vi.fn();
    const setPlayerAnswersHydrated = vi.fn();
    const setError = vi.fn();
    const setJoined = vi.fn();
    const setConnectionStatus = vi.fn();
    const setSpeakerQuestions = vi.fn();

    render(
      <TestHarness
        activeQuestionIdRef={createRef<string | null>() as any}
        activeQuestionTypeRef={
          createRef<"single" | "multi" | "tag_cloud" | "ranking" | null>() as any
        }
        selectedRef={createRef<string[]>() as any}
        rankOrderRef={createRef<string[]>() as any}
        tagAnswersRef={createRef<string[]>() as any}
        setQuiz={setQuiz}
        setSelected={setSelected}
        setRankOrder={setRankOrder}
        setTagAnswers={setTagAnswers}
        setSubmittedAnswers={setSubmittedAnswers}
        setSubmittedQuestionIds={setSubmittedQuestionIds}
        setPlayerAnswersHydrated={setPlayerAnswersHydrated}
        setError={setError}
        setJoined={setJoined}
        setConnectionStatus={setConnectionStatus}
        setSpeakerQuestions={setSpeakerQuestions}
      />,
    );

    const payload = { q1: ["a"], q2: ["b", "c"] };
    fireSocketEvent("player:answers", payload);

    expect(setSubmittedAnswers).toHaveBeenCalledWith(payload);
    expect(setSubmittedQuestionIds).toHaveBeenCalledWith(["q1", "q2"]);
    expect(setPlayerAnswersHydrated).toHaveBeenCalledWith(true);
  });

  it("stores current selection on answer:submitted", () => {
    const setSubmittedAnswers = vi.fn();
    const setSubmittedQuestionIds = vi.fn();
    const setPlayerAnswersHydrated = vi.fn();
    const onQuestionSubmitted = vi.fn();

    render(
      <TestHarness
        activeQuestionIdRef={{ current: "q-active" }}
        activeQuestionTypeRef={{ current: "single" }}
        selectedRef={{ current: ["opt-1"] }}
        rankOrderRef={{ current: [] }}
        tagAnswersRef={{ current: [""] }}
        setQuiz={vi.fn()}
        setSelected={vi.fn()}
        setRankOrder={vi.fn()}
        setTagAnswers={vi.fn()}
        setSubmittedAnswers={setSubmittedAnswers}
        setSubmittedQuestionIds={setSubmittedQuestionIds}
        setPlayerAnswersHydrated={setPlayerAnswersHydrated}
        onQuestionSubmitted={onQuestionSubmitted}
        setError={vi.fn()}
        setJoined={vi.fn()}
        setConnectionStatus={vi.fn()}
        setSpeakerQuestions={vi.fn()}
      />,
    );

    fireSocketEvent("answer:submitted");

    expect(setSubmittedAnswers).toHaveBeenCalled();
    expect(setSubmittedQuestionIds).toHaveBeenCalled();
    expect(setPlayerAnswersHydrated).toHaveBeenCalledWith(true);
    expect(onQuestionSubmitted).toHaveBeenCalledWith("q-active");
  });
});
