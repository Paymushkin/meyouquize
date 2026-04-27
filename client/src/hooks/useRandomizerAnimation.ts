import { useEffect, useMemo, useRef, useState } from "react";
import { type PublicViewState } from "@meyouquize/shared";
import { buildNumberRange, parseNames } from "../features/randomizer/randomizerLogic";

export const RANDOMIZER_ROLL_DURATION_MS = 3000;
export const RANDOMIZER_WINNER_HOLD_MS = 1000;
const RANDOMIZER_ROLL_INTERVAL_MS = 80;

function setArrayItem<T>(items: T[], index: number, value: T): T[] {
  const next = [...items];
  next[index] = value;
  return next;
}

function buildPool(view: PublicViewState): string[] {
  return view.randomizerMode === "names"
    ? parseNames(view.randomizerNamesText)
    : buildNumberRange(view.randomizerMinNumber, view.randomizerMaxNumber);
}

export function useRandomizerAnimation(view: PublicViewState) {
  const [displayedWinners, setDisplayedWinners] = useState<string[]>(view.randomizerCurrentWinners);
  const [rollingMask, setRollingMask] = useState<boolean[]>(() =>
    view.randomizerCurrentWinners.map(() => false),
  );
  const [revealedMask, setRevealedMask] = useState<boolean[]>(() =>
    view.randomizerCurrentWinners.map(() => true),
  );
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);
  const lastAnimatedRunIdRef = useRef(view.randomizerRunId);
  const pool = useMemo(() => buildPool(view), [view]);

  useEffect(() => {
    const finalWinners = view.randomizerCurrentWinners;
    if (finalWinners.length === 0) {
      setDisplayedWinners([]);
      setRollingMask([]);
      setRevealedMask([]);
      setSettlingIndex(null);
      return;
    }
    if (view.randomizerRunId === lastAnimatedRunIdRef.current) {
      setDisplayedWinners(finalWinners);
      setRollingMask(finalWinners.map(() => false));
      setRevealedMask(finalWinners.map(() => true));
      setSettlingIndex(null);
      return;
    }
    lastAnimatedRunIdRef.current = view.randomizerRunId;
    const fallbackPool = pool.length > 0 ? pool : finalWinners;
    const timers: number[] = [];
    setDisplayedWinners(finalWinners.map((winner) => winner || "—"));
    setRollingMask(finalWinners.map(() => false));
    setRevealedMask(finalWinners.map(() => false));
    setSettlingIndex(null);

    finalWinners.forEach((winner, index) => {
      const startDelay = index * (RANDOMIZER_ROLL_DURATION_MS + RANDOMIZER_WINNER_HOLD_MS);
      const endAt = startDelay + RANDOMIZER_ROLL_DURATION_MS;
      const settleEndAt = endAt + RANDOMIZER_WINNER_HOLD_MS;
      let intervalId = 0;

      timers.push(
        window.setTimeout(() => {
          setRollingMask((prev) => setArrayItem(prev, index, true));
          intervalId = window.setInterval(() => {
            const randomValue =
              fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? winner;
            setDisplayedWinners((prev) => setArrayItem(prev, index, randomValue));
          }, RANDOMIZER_ROLL_INTERVAL_MS);
          timers.push(intervalId);
        }, startDelay),
      );

      timers.push(
        window.setTimeout(() => {
          if (intervalId) window.clearInterval(intervalId);
          setDisplayedWinners((prev) => setArrayItem(prev, index, winner));
          setRollingMask((prev) => setArrayItem(prev, index, false));
          setSettlingIndex(index);
          setRevealedMask((prev) => setArrayItem(prev, index, true));
        }, endAt),
      );

      timers.push(
        window.setTimeout(() => {
          setSettlingIndex((prev) => (prev === index ? null : prev));
        }, settleEndAt),
      );
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [pool, view.randomizerCurrentWinners, view.randomizerRunId]);

  const activeRollingIndex = rollingMask.findIndex(Boolean);
  const focusedWinnerIndex =
    activeRollingIndex >= 0
      ? activeRollingIndex
      : settlingIndex != null
        ? settlingIndex
        : displayedWinners.length > 0
          ? displayedWinners.length - 1
          : -1;
  const focusedWinner = focusedWinnerIndex >= 0 ? displayedWinners[focusedWinnerIndex] : "";
  const revealedWinnerRows = displayedWinners
    .map((winner, idx) => ({ winner, idx }))
    .filter((row) => revealedMask[row.idx])
    .reverse();

  return {
    displayedWinners,
    rollingMask,
    settlingIndex,
    focusedWinnerIndex,
    focusedWinner,
    revealedWinnerRows,
  };
}
