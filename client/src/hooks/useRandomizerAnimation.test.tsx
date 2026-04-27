// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { type PublicViewState, normalizePublicViewState } from "@meyouquize/shared";
import {
  RANDOMIZER_ROLL_DURATION_MS,
  RANDOMIZER_WINNER_HOLD_MS,
  useRandomizerAnimation,
} from "./useRandomizerAnimation";

type Snapshot = ReturnType<typeof useRandomizerAnimation>;

function getSnapshot(state: Snapshot | null): Snapshot {
  if (!state) throw new Error("Hook state is not ready");
  return state;
}

function makeView(overrides: Partial<PublicViewState> = {}): PublicViewState {
  return normalizePublicViewState({
    mode: "randomizer",
    randomizerMode: "names",
    randomizerNamesText: "Ира\nОля\nПетя\nКоля",
    randomizerCurrentWinners: [],
    randomizerRunId: 0,
    ...overrides,
  });
}

function HookHarness({
  view,
  onState,
}: {
  view: PublicViewState;
  onState: (state: Snapshot) => void;
}) {
  const state = useRandomizerAnimation(view);
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

describe("useRandomizerAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("не запускает анимацию повторно при том же runId", () => {
    let latest: Snapshot | null = null;
    const onState = vi.fn((state: Snapshot) => {
      latest = state;
    });
    const view = makeView({
      randomizerCurrentWinners: ["Оля", "Петя"],
      randomizerRunId: 0,
    });
    render(<HookHarness view={view} onState={onState} />);
    vi.runOnlyPendingTimers();

    const state = getSnapshot(latest);
    expect(state.focusedWinner).toBe("Петя");
    expect(state.revealedWinnerRows.map((row) => row.winner)).toEqual(["Петя", "Оля"]);
    expect(state.rollingMask.some(Boolean)).toBe(false);
  });

  it("при новом runId последовательно открывает победителей", () => {
    let latest: Snapshot | null = null;
    const onState = vi.fn((state: Snapshot) => {
      latest = state;
    });
    const { rerender } = render(
      <HookHarness
        view={makeView({
          randomizerCurrentWinners: ["Оля", "Петя"],
          randomizerRunId: 0,
        })}
        onState={onState}
      />,
    );

    rerender(
      <HookHarness
        view={makeView({
          randomizerCurrentWinners: ["Оля", "Петя"],
          randomizerRunId: 1,
        })}
        onState={onState}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(RANDOMIZER_ROLL_DURATION_MS);
    });
    let state = getSnapshot(latest);
    expect(state.revealedWinnerRows.map((row) => row.winner)).toEqual(["Оля"]);
    expect(state.focusedWinner).toBe("Оля");
    expect(state.settlingIndex).toBe(0);

    act(() => {
      vi.advanceTimersByTime(RANDOMIZER_WINNER_HOLD_MS + RANDOMIZER_ROLL_DURATION_MS);
    });
    state = getSnapshot(latest);
    expect(state.revealedWinnerRows.map((row) => row.winner)).toEqual(["Петя", "Оля"]);
    expect(state.focusedWinner).toBe("Петя");
  });

  it("очищает состояние когда winners пустой", () => {
    let latest: Snapshot | null = null;
    const onState = vi.fn((state: Snapshot) => {
      latest = state;
    });
    const { rerender } = render(
      <HookHarness
        view={makeView({
          randomizerCurrentWinners: ["Оля"],
          randomizerRunId: 0,
        })}
        onState={onState}
      />,
    );

    rerender(
      <HookHarness
        view={makeView({
          randomizerCurrentWinners: [],
          randomizerRunId: 2,
        })}
        onState={onState}
      />,
    );
    vi.runOnlyPendingTimers();

    const state = getSnapshot(latest);
    expect(state.focusedWinnerIndex).toBe(-1);
    expect(state.revealedWinnerRows).toEqual([]);
    expect(state.displayedWinners).toEqual([]);
  });
});
