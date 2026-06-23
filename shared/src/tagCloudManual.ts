import { buildCloudWordsForDisplay } from "./tagCloudMerge.js";
import { computeTemperatureWeightedAverage } from "./temperatureVote.js";

export type CloudWordCount = { text: string; count: number };

export type TagCloudQuestionManualState = {
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
  /** Для single/multi/temperature: optionId в поле text, count — отображаемое число голосов. */
  optionVoteCountOverrides: CloudWordCount[];
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

export function resolveOptionDisplayCount(
  optionId: string,
  liveCount: number,
  overrides: CloudWordCount[],
): number {
  const row = overrides.find((item) => item.text === optionId);
  return row !== undefined ? row.count : liveCount;
}

export function hasOptionVoteCountOverride(overrides: CloudWordCount[], optionId: string): boolean {
  return overrides.some((item) => item.text === optionId);
}

export function applyOptionVoteCountOverrides<T extends { optionId: string; count: number }>(
  optionStats: T[],
  overrides: CloudWordCount[],
): T[] {
  if (overrides.length === 0) return optionStats;
  const map = new Map(
    overrides.map((item) => [item.text, Math.max(0, Math.trunc(item.count))] as const),
  );
  return optionStats.map((stat) => {
    const next = map.get(stat.optionId);
    return next === undefined ? stat : { ...stat, count: next };
  });
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
