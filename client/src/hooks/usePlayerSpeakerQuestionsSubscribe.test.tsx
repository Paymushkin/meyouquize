// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { usePlayerSpeakerQuestionsSubscribe } from "./usePlayerSpeakerQuestionsSubscribe";

type Handler = (...args: unknown[]) => void;

const { handlers, mockSocket } = vi.hoisted(() => {
  const hoistedHandlers = new Map<string, Set<Handler>>();
  const hoistedSocket = {
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

function fireSocketEvent(event: string) {
  const set = handlers.get(event);
  if (!set) return;
  for (const cb of set) cb();
}

function subscribeEmits() {
  return mockSocket.emit.mock.calls.filter(
    (call) => call[0] === "speaker:questions:subscribe",
  ) as Array<[string, { slug: string; viewer: string }]>;
}

function TestHarness(props: { slug: string; joined: boolean; dialogOpen: boolean }) {
  usePlayerSpeakerQuestionsSubscribe(props);
  return null;
}

describe("usePlayerSpeakerQuestionsSubscribe", () => {
  beforeEach(() => {
    handlers.clear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it("does not subscribe until joined", () => {
    render(<TestHarness slug="nf1" joined={false} dialogOpen={false} />);
    expect(subscribeEmits()).toHaveLength(0);
  });

  it("subscribes on join and again on socket connect", () => {
    render(<TestHarness slug="nf1" joined={true} dialogOpen={false} />);
    expect(subscribeEmits()).toEqual([
      ["speaker:questions:subscribe", { slug: "nf1", viewer: "player" }],
    ]);

    fireSocketEvent("connect");
    expect(subscribeEmits()).toHaveLength(2);
    expect(subscribeEmits()[1]).toEqual([
      "speaker:questions:subscribe",
      { slug: "nf1", viewer: "player" },
    ]);
  });

  it("re-subscribes when speaker dialog opens", () => {
    const { rerender } = render(<TestHarness slug="nf1" joined={true} dialogOpen={false} />);
    expect(subscribeEmits()).toHaveLength(1);

    rerender(<TestHarness slug="nf1" joined={true} dialogOpen={true} />);
    expect(subscribeEmits()).toHaveLength(2);
    expect(subscribeEmits()[1]).toEqual([
      "speaker:questions:subscribe",
      { slug: "nf1", viewer: "player" },
    ]);
  });

  it("does not emit on dialog close", () => {
    const { rerender } = render(<TestHarness slug="nf1" joined={true} dialogOpen={true} />);
    const afterOpen = subscribeEmits().length;
    rerender(<TestHarness slug="nf1" joined={true} dialogOpen={false} />);
    expect(subscribeEmits()).toHaveLength(afterOpen);
  });
});
