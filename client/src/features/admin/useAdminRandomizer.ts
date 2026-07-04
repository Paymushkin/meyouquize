import type { PublicViewPayload } from "@meyouquize/shared";
import type { PublicViewSetPatch } from "../../publicViewContract";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyRandomizerFromPublicViewPayload } from "./applyRandomizerFromPublicView";
import {
  getRandomizerPool,
  makeRandomizerTimestamp,
  pickRandomWinners,
  randomizerNamesTextForPublicView,
  type RandomizerHistoryEntry,
  type RandomizerListMode,
  type RandomizerMode,
} from "../randomizer/randomizerLogic";

type EmitPatch = (patch: PublicViewSetPatch) => void;

type SetPublicResultsView = (
  mode:
    | "title"
    | "question"
    | "leaderboard"
    | "speaker_questions"
    | "reactions"
    | "randomizer"
    | "photo_wall",
  questionId?: string,
  patch?: PublicViewSetPatch,
) => void;

type Params = {
  emitPublicViewPatch: EmitPatch;
  setPublicResultsView: SetPublicResultsView;
  setMessage: (message: string) => void;
  eventParticipantNicknames: string[];
};

export type AdminSetPublicResultsView = SetPublicResultsView;

export function useAdminRandomizer({
  emitPublicViewPatch,
  setPublicResultsView,
  setMessage,
  eventParticipantNicknames,
}: Params) {
  const [mode, setMode] = useState<RandomizerMode>("names");
  const [listMode, setListMode] = useState<RandomizerListMode>("free_list");
  const [title, setTitle] = useState("Рандомайзер");
  const [namesText, setNamesText] = useState("");
  const [minNumber, setMinNumber] = useState(1);
  const [maxNumber, setMaxNumber] = useState(100);
  const [winnersCount, setWinnersCount] = useState(1);
  const [excludeWinners, setExcludeWinners] = useState(true);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [currentWinners, setCurrentWinners] = useState<string[]>([]);
  const [animationPool, setAnimationPool] = useState<string[]>([]);
  const [history, setHistory] = useState<RandomizerHistoryEntry[]>([]);
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const runTimerRef = useRef<number | null>(null);
  const namesEditedRef = useRef(false);

  const applyFromPublicView = useCallback(
    (payload: PublicViewPayload, options?: { roomLoad?: boolean }) => {
      applyRandomizerFromPublicViewPayload(
        payload,
        {
          setMode,
          setListMode,
          setTitle,
          setNamesText,
          setMinNumber,
          setMaxNumber,
          setWinnersCount,
          setExcludeWinners,
          setSelectedWinners,
          setCurrentWinners,
          setAnimationPool,
          setHistory,
          setRunId,
        },
        options,
      );
    },
    [],
  );

  useEffect(() => {
    if (mode !== "names") return;
    if (listMode !== "free_list") return;
    if (namesEditedRef.current) return;
    if (namesText.trim().length > 0) return;
    if (eventParticipantNicknames.length === 0) return;
    setNamesText(eventParticipantNicknames.join("\n"));
  }, [eventParticipantNicknames, listMode, mode, namesText]);

  const runRandomizer = useCallback(() => {
    const effectiveNamesText =
      listMode === "participants_only" ? eventParticipantNicknames.join("\n") : namesText;
    const pool = getRandomizerPool({
      mode,
      namesText: effectiveNamesText,
      minNumber,
      maxNumber,
      winnersCount,
      excludeWinners,
      selectedWinners,
    });
    if (pool.length === 0) {
      setMessage("Для рандомайзера нет доступных значений");
      return;
    }
    const winners = pickRandomWinners(pool, winnersCount);
    if (winners.length === 0) {
      setMessage("Не удалось выбрать победителей");
      return;
    }
    const nextSelected = excludeWinners ? [...selectedWinners, ...winners] : selectedWinners;
    const nextHistory: RandomizerHistoryEntry[] = [
      { timestamp: makeRandomizerTimestamp(), winners, mode },
      ...history,
    ].slice(0, 200);
    const nextRunId = runId + 1;
    setCurrentWinners(winners);
    setAnimationPool(pool);
    setSelectedWinners(nextSelected);
    setHistory(nextHistory);
    setRunId(nextRunId);
    setIsRunning(true);
    if (runTimerRef.current != null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    const totalRunMs = winners.length * (3000 + 1000);
    runTimerRef.current = window.setTimeout(() => {
      setIsRunning(false);
      runTimerRef.current = null;
    }, totalRunMs);
    setPublicResultsView("randomizer", undefined, {
      randomizerMode: mode,
      randomizerListMode: listMode,
      randomizerTitle: title,
      randomizerNamesText: randomizerNamesTextForPublicView(
        listMode,
        listMode === "participants_only" ? "" : namesText,
      ),
      randomizerMinNumber: minNumber,
      randomizerMaxNumber: maxNumber,
      randomizerWinnersCount: winnersCount,
      randomizerExcludeWinners: excludeWinners,
      randomizerSelectedWinners: nextSelected,
      randomizerCurrentWinners: winners,
      randomizerAnimationPool: pool,
      randomizerHistory: nextHistory,
      randomizerRunId: nextRunId,
    });
  }, [
    eventParticipantNicknames,
    excludeWinners,
    history,
    listMode,
    maxNumber,
    minNumber,
    mode,
    namesText,
    runId,
    selectedWinners,
    setMessage,
    setPublicResultsView,
    title,
    winnersCount,
  ]);

  const resetRandomizer = useCallback(() => {
    if (runTimerRef.current != null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    setIsRunning(false);
    setSelectedWinners([]);
    setCurrentWinners([]);
    setAnimationPool([]);
    setHistory([]);
    setRunId(0);
    emitPublicViewPatch({
      randomizerSelectedWinners: [],
      randomizerCurrentWinners: [],
      randomizerAnimationPool: [],
      randomizerHistory: [],
      randomizerRunId: 0,
    });
  }, [emitPublicViewPatch]);

  const clearRandomizerScreenData = useCallback(() => {
    if (runTimerRef.current != null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    setIsRunning(false);
    setCurrentWinners([]);
    setAnimationPool([]);
    emitPublicViewPatch({
      randomizerCurrentWinners: [],
      randomizerAnimationPool: [],
    });
  }, [emitPublicViewPatch]);

  const markNamesEdited = useCallback(() => {
    namesEditedRef.current = true;
  }, []);

  return {
    mode,
    setMode,
    listMode,
    setListMode,
    title,
    setTitle,
    namesText,
    setNamesText,
    minNumber,
    setMinNumber,
    maxNumber,
    setMaxNumber,
    winnersCount,
    setWinnersCount,
    excludeWinners,
    setExcludeWinners,
    selectedWinners,
    currentWinners,
    animationPool,
    history,
    runId,
    isRunning,
    namesEditedRef,
    applyFromPublicView,
    runRandomizer,
    resetRandomizer,
    clearRandomizerScreenData,
    markNamesEdited,
  };
}
