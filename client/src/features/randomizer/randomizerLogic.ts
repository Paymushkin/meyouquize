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

/** Свободный список имён в publicView; участники из комнаты туда не пишем. */
export const RANDOMIZER_FREE_LIST_NAMES_TEXT_MAX_LENGTH = 150_000;

/** Текст для сохранения в publicView: в режиме «только участники» список не дублируем. */
export function randomizerNamesTextForPublicView(
  listMode: RandomizerListMode,
  namesText: string,
): string {
  if (listMode === "participants_only") return "";
  return namesText.slice(0, RANDOMIZER_FREE_LIST_NAMES_TEXT_MAX_LENGTH);
}

export function parseNames(linesText: string): string[] {
  return linesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Свободный список — устаревший снимок участников (в комнату зашли новые, старые имена на месте). */
export function isStaleParticipantSnapshot(savedNames: string[], liveNicknames: string[]): boolean {
  if (savedNames.length === 0 || liveNicknames.length === 0) return false;
  if (savedNames.length >= liveNicknames.length) return false;
  const liveLower = new Set(liveNicknames.map((name) => name.toLowerCase()));
  return savedNames.every((name) => liveLower.has(name.toLowerCase()));
}

/**
 * Свободный список — старые nickname без ФИО/должности/аптеки,
 * а в комнате уже полные подписи «Имя · должность · компания».
 */
export function isOutdatedParticipantIdentitySnapshot(
  savedNames: string[],
  liveLabels: string[],
): boolean {
  if (savedNames.length === 0 || liveLabels.length === 0) return false;
  if (savedNames.length !== liveLabels.length) return false;
  const liveByPrimary = new Map<string, string>();
  for (const label of liveLabels) {
    const primary = label.split(" · ")[0]?.trim().toLowerCase() ?? "";
    if (!primary) continue;
    liveByPrimary.set(primary, label);
  }
  let upgraded = 0;
  for (const saved of savedNames) {
    const key = saved.trim().toLowerCase();
    const live = liveByPrimary.get(key);
    if (!live) return false;
    if (live.trim().toLowerCase() !== key) upgraded += 1;
  }
  return upgraded > 0;
}

/** Нужно ли подтянуть свободный список из актуальных подписей комнаты. */
export function shouldSyncParticipantNamesList(
  savedNames: string[],
  liveLabels: string[],
): boolean {
  return (
    isStaleParticipantSnapshot(savedNames, liveLabels) ||
    isOutdatedParticipantIdentitySnapshot(savedNames, liveLabels)
  );
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

export type RandomizerAnimationPoolSource = {
  randomizerMode: RandomizerMode;
  randomizerNamesText: string;
  randomizerMinNumber: number;
  randomizerMaxNumber: number;
  randomizerAnimationPool?: string[];
};

/** Пул для анимации перебора на проекторе (snapshot при запуске или список из publicView). */
export function buildRandomizerAnimationPool(source: RandomizerAnimationPoolSource): string[] {
  if (Array.isArray(source.randomizerAnimationPool) && source.randomizerAnimationPool.length > 0) {
    return source.randomizerAnimationPool;
  }
  return source.randomizerMode === "names"
    ? parseNames(source.randomizerNamesText)
    : buildNumberRange(source.randomizerMinNumber, source.randomizerMaxNumber);
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
