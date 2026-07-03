import { buildCloudWordsForDisplay } from "./tagCloudMerge.js";
import { computeTemperatureWeightedAverage } from "./temperatureVote.js";

export type CloudWordCount = { text: string; count: number };

/** optionId в text; count — дельта к live (mode delta) или абсолют (legacy absolute). */
export type OptionVoteCountOverride = {
  text: string;
  count: number;
  mode?: "absolute" | "delta";
};

export type TagCloudQuestionManualState = {
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
  optionVoteCountOverrides: OptionVoteCountOverride[];
};

export type TagCloudManualByQuestionId = Record<string, TagCloudQuestionManualState>;

export const EMPTY_TAG_CLOUD_QUESTION_MANUAL: TagCloudQuestionManualState = {
  hiddenTagTexts: [],
  injectedTagWords: [],
  tagCountOverrides: [],
  optionVoteCountOverrides: [],
};

export function resolveTagCloudManualForQuestion(
  manual: TagCloudManualByQuestionId | undefined,
  questionId?: string,
): TagCloudQuestionManualState {
  const qid = questionId?.trim() ?? "";
  if (!qid) return { ...EMPTY_TAG_CLOUD_QUESTION_MANUAL };
  const entry = manual?.[qid];
  if (!entry) return { ...EMPTY_TAG_CLOUD_QUESTION_MANUAL };
  return {
    hiddenTagTexts: [...entry.hiddenTagTexts],
    injectedTagWords: [...entry.injectedTagWords],
    tagCountOverrides: [...entry.tagCountOverrides],
    optionVoteCountOverrides: [...entry.optionVoteCountOverrides],
  };
}

type ProjectorTagCloudView = {
  mode: string;
  questionId?: string;
  tagCloudManualByQuestionId: TagCloudManualByQuestionId;
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
};

/** Проектор читает ручные теги из tagCloudManualByQuestionId; top-level поля — только runtime-снимок. */
export function withProjectorTagCloudFields<T extends ProjectorTagCloudView>(view: T): T {
  if (view.mode !== "question" || !view.questionId?.trim()) {
    return {
      ...view,
      hiddenTagTexts: [],
      injectedTagWords: [],
      tagCountOverrides: [],
    };
  }
  const resolved = resolveTagCloudManualForQuestion(
    view.tagCloudManualByQuestionId,
    view.questionId,
  );
  return {
    ...view,
    hiddenTagTexts: resolved.hiddenTagTexts,
    injectedTagWords: resolved.injectedTagWords,
    tagCountOverrides: resolved.tagCountOverrides,
  };
}

export function hasTagCloudManualContent(state: TagCloudQuestionManualState): boolean {
  return (
    state.hiddenTagTexts.length > 0 ||
    state.injectedTagWords.length > 0 ||
    state.tagCountOverrides.length > 0 ||
    state.optionVoteCountOverrides.length > 0
  );
}

/** Перенос legacy top-level полей в карту при загрузке старых publicView. */
export function migrateLegacyTagCloudManualIntoMap(
  manual: TagCloudManualByQuestionId,
  raw: {
    questionId?: string;
    hiddenTagTexts?: string[];
    injectedTagWords?: CloudWordCount[];
    tagCountOverrides?: CloudWordCount[];
    optionVoteCountOverrides?: CloudWordCount[];
  },
): TagCloudManualByQuestionId {
  const qid = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
  if (!qid || manual[qid]) return manual;
  const legacy: TagCloudQuestionManualState = {
    hiddenTagTexts: Array.isArray(raw.hiddenTagTexts)
      ? raw.hiddenTagTexts.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [],
    injectedTagWords: Array.isArray(raw.injectedTagWords) ? raw.injectedTagWords : [],
    tagCountOverrides: Array.isArray(raw.tagCountOverrides) ? raw.tagCountOverrides : [],
    optionVoteCountOverrides: Array.isArray(raw.optionVoteCountOverrides)
      ? raw.optionVoteCountOverrides
      : [],
  };
  if (!hasTagCloudManualContent(legacy)) return manual;
  return { ...manual, [qid]: legacy };
}

function resolveOptionOverrideDisplayCount(
  liveCount: number,
  row: OptionVoteCountOverride,
): number {
  const safeLive = Math.max(0, Math.trunc(liveCount));
  const safeCount = Math.trunc(row.count);
  if (row.mode === "delta") {
    return Math.max(0, safeLive + safeCount);
  }
  // legacy: абсолютное отображаемое число (замораживает live)
  return Math.max(0, safeCount);
}

export function resolveOptionDisplayCount(
  optionId: string,
  liveCount: number,
  overrides: OptionVoteCountOverride[],
): number {
  const row = overrides.find((item) => item.text === optionId);
  return row !== undefined ? resolveOptionOverrideDisplayCount(liveCount, row) : liveCount;
}

export function hasOptionVoteCountOverride(
  overrides: OptionVoteCountOverride[],
  optionId: string,
): boolean {
  return overrides.some((item) => item.text === optionId);
}

export function applyOptionVoteCountOverrides<T extends { optionId: string; count: number }>(
  optionStats: T[],
  overrides: OptionVoteCountOverride[],
): T[] {
  if (overrides.length === 0) return optionStats;
  const overrideById = new Map(overrides.map((item) => [item.text, item] as const));
  const seen = new Set<string>();
  const next = optionStats.map((stat) => {
    const row = overrideById.get(stat.optionId);
    if (row === undefined) return stat;
    seen.add(stat.optionId);
    return { ...stat, count: resolveOptionOverrideDisplayCount(stat.count, row) };
  });
  for (const row of overrides) {
    if (seen.has(row.text)) continue;
    next.push({ optionId: row.text, count: resolveOptionOverrideDisplayCount(0, row) } as T);
  }
  return next;
}

export type QuestionResultManualDisplayRow = {
  questionId: string;
  type: string;
  optionStats: Array<{ optionId: string; count: number; weight?: number }>;
  tagCloud: CloudWordCount[];
  temperatureValue?: number | null;
};

/** Применяет ручные правки из админки к строке результатов (отчёт, проектор и т.д.). */
export function applyQuestionResultManualDisplay<T extends QuestionResultManualDisplayRow>(
  row: T,
  manualByQuestionId: TagCloudManualByQuestionId,
): T {
  const manual = resolveTagCloudManualForQuestion(manualByQuestionId, row.questionId);
  const hasOptionOverrides = manual.optionVoteCountOverrides.length > 0;
  const hasTagManual =
    manual.hiddenTagTexts.length > 0 ||
    manual.injectedTagWords.length > 0 ||
    manual.tagCountOverrides.length > 0;

  if (!hasOptionOverrides && !hasTagManual) return row;

  let next: T = { ...row };

  if (hasOptionOverrides && row.type !== "ranking" && row.type !== "tag_cloud") {
    const optionStats = applyOptionVoteCountOverrides(
      row.optionStats,
      manual.optionVoteCountOverrides,
    );
    next = { ...next, optionStats };
    if (row.type === "temperature") {
      const temperatureValue = computeTemperatureWeightedAverage(
        optionStats.map((stat) => ({ count: stat.count, weight: stat.weight ?? 0 })),
      );
      next = { ...next, temperatureValue: temperatureValue ?? undefined };
    }
  }

  if (row.type === "tag_cloud" || hasTagManual) {
    next = {
      ...next,
      tagCloud: buildCloudWordsForDisplay({
        liveTags: row.tagCloud,
        hiddenTagTexts: manual.hiddenTagTexts,
        injectedTagWords: manual.injectedTagWords,
        tagCountOverrides: manual.tagCountOverrides,
      }),
    };
  }

  return next;
}
