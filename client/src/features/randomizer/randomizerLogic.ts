export type RandomizerMode = "names" | "numbers";
export type RandomizerListMode = "participants_only" | "free_list";

export type RandomizerHistoryEntry = {
  timestamp: string;
  winners: string[];
  mode: RandomizerMode;
};

export type RandomizerStateLike = {
  mode: RandomizerMode;
  namesText: string;
  minNumber: number;
  maxNumber: number;
  winnersCount: number;
  excludeWinners: boolean;
  selectedWinners: string[];
};

export function parseNames(linesText: string): string[] {
  return linesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function buildNumberRange(minNumber: number, maxNumber: number): string[] {
  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber)) return [];
  const min = Math.trunc(minNumber);
  const max = Math.trunc(maxNumber);
  if (min > max) return [];
  const out: string[] = [];
  for (let n = min; n <= max; n += 1) out.push(String(n));
  return out;
}

export function getRandomizerPool(state: RandomizerStateLike): string[] {
  const source =
    state.mode === "names"
      ? parseNames(state.namesText)
      : buildNumberRange(state.minNumber, state.maxNumber);
  if (!state.excludeWinners) return source;
  const selected = new Set(state.selectedWinners);
  return source.filter((item) => !selected.has(item));
}

export function pickRandomWinners(pool: string[], requestedCount: number): string[] {
  if (pool.length === 0) return [];
  const count = Math.max(1, Math.min(pool.length, Math.trunc(requestedCount || 1)));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function makeRandomizerTimestamp(): string {
  return new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
