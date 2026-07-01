import type { PublicViewPayload } from "@meyouquize/shared";
import {
  randomizerNamesTextForPublicView,
  type RandomizerHistoryEntry,
  type RandomizerListMode,
  type RandomizerMode,
} from "../randomizer/randomizerLogic";

export type RandomizerPublicViewState = {
  mode: RandomizerMode;
  listMode: RandomizerListMode;
  title: string;
  namesText: string;
  minNumber: number;
  maxNumber: number;
  winnersCount: number;
  excludeWinners: boolean;
  selectedWinners: string[];
  currentWinners: string[];
  animationPool: string[];
  history: RandomizerHistoryEntry[];
  runId: number;
};

type Setters = {
  setMode: (value: RandomizerMode) => void;
  setListMode: (value: RandomizerListMode) => void;
  setTitle: (value: string) => void;
  setNamesText: (value: string) => void;
  setMinNumber: (value: number) => void;
  setMaxNumber: (value: number) => void;
  setWinnersCount: (value: number) => void;
  setExcludeWinners: (value: boolean) => void;
  setSelectedWinners: (value: string[]) => void;
  setCurrentWinners: (value: string[]) => void;
  setAnimationPool: (value: string[]) => void;
  setHistory: (value: RandomizerHistoryEntry[]) => void;
  setRunId: (value: number) => void;
};

export function applyRandomizerFromPublicViewPayload(
  payload: PublicViewPayload,
  setters: Setters,
  options?: { roomLoad?: boolean },
): void {
  const listMode: RandomizerListMode =
    payload.randomizerListMode === "participants_only" ? "participants_only" : "free_list";
  setters.setMode(payload.randomizerMode === "numbers" ? "numbers" : "names");
  setters.setListMode(listMode);
  if (typeof payload.randomizerTitle === "string") {
    setters.setTitle(payload.randomizerTitle);
  }
  if (options?.roomLoad) {
    if (typeof payload.randomizerNamesText === "string") {
      setters.setNamesText(randomizerNamesTextForPublicView(listMode, payload.randomizerNamesText));
    }
  } else {
    setters.setNamesText(
      typeof payload.randomizerNamesText === "string" ? payload.randomizerNamesText : "",
    );
  }
  if (typeof payload.randomizerMinNumber === "number") {
    setters.setMinNumber(Math.trunc(payload.randomizerMinNumber));
  }
  if (typeof payload.randomizerMaxNumber === "number") {
    setters.setMaxNumber(Math.trunc(payload.randomizerMaxNumber));
  }
  if (typeof payload.randomizerWinnersCount === "number") {
    setters.setWinnersCount(Math.max(1, Math.trunc(payload.randomizerWinnersCount)));
  }
  if (typeof payload.randomizerExcludeWinners === "boolean") {
    setters.setExcludeWinners(payload.randomizerExcludeWinners);
  }
  if (Array.isArray(payload.randomizerSelectedWinners)) {
    setters.setSelectedWinners(
      payload.randomizerSelectedWinners.filter((item): item is string => typeof item === "string"),
    );
  }
  if (Array.isArray(payload.randomizerCurrentWinners)) {
    setters.setCurrentWinners(
      payload.randomizerCurrentWinners.filter((item): item is string => typeof item === "string"),
    );
  }
  if (Array.isArray(payload.randomizerAnimationPool)) {
    setters.setAnimationPool(
      payload.randomizerAnimationPool.filter((item): item is string => typeof item === "string"),
    );
  }
  if (Array.isArray(payload.randomizerHistory)) {
    setters.setHistory(
      payload.randomizerHistory
        .filter((row) => row && typeof row.timestamp === "string" && Array.isArray(row.winners))
        .map((row) => ({
          timestamp: row.timestamp,
          winners: row.winners.filter((item): item is string => typeof item === "string"),
          mode: row.mode === "numbers" ? "numbers" : "names",
        })),
    );
  }
  if (typeof payload.randomizerRunId === "number") {
    setters.setRunId(Math.max(0, Math.trunc(payload.randomizerRunId)));
  }
}
