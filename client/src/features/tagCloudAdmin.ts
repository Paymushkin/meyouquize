import {
  buildCloudWordsForDisplay,
  normalizeTagComparable,
  sanitizeTagCloudManualByQuestionId,
  type CloudWordCount,
  type OptionVoteCountOverride,
} from "@meyouquize/shared";
import type { CloudManualStateByQuestion } from "../publicViewContract";

/**
 * Парсит многострочный ввод вида «слово 10» / «слово: 5» в список пар text/count.
 */
export function parseInjectedTagLines(value: string): CloudWordCount[] {
  const map = new Map<string, number>();
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^(.*?)[\s:;,\-–—()]+(\d+)$/);
      if (!match) return;
      const text = normalizeTagComparable(match[1].trim());
      const count = Number.parseInt(match[2], 10);
      if (!text || !Number.isFinite(count) || count < 1) return;
      map.set(text, (map.get(text) ?? 0) + count);
    });
  return Array.from(map.entries()).map(([text, count]) => ({ text, count }));
}

/** Сливает распарсенные строки с уже сохранёнными injected-словами (суммирует count по text). */
export function mergeInjectedTagWords(
  existing: CloudWordCount[],
  parsed: CloudWordCount[],
): CloudWordCount[] {
  const merged = new Map<string, CloudWordCount>();
  [...existing, ...parsed].forEach((item) => {
    const key = normalizeTagComparable(item.text);
    if (!key) return;
    const prev = merged.get(key);
    if (prev) {
      prev.count += item.count;
      return;
    }
    merged.set(key, { text: key, count: item.count });
  });
  return Array.from(merged.values());
}

export function toggleHiddenTagText(hidden: string[], tagText: string): string[] {
  return hidden.includes(tagText)
    ? hidden.filter((item) => item !== tagText)
    : [...hidden, tagText];
}

export function setTagCountOverrideRow(
  current: CloudWordCount[],
  tagText: string,
  nextCount: number,
): CloudWordCount[] {
  const safeCount = Math.max(0, Math.trunc(Number.isFinite(nextCount) ? nextCount : 0));
  const without = current.filter((item) => item.text !== tagText);
  return [...without, { text: tagText, count: safeCount }];
}

export function clearCountOverrideRow(current: CloudWordCount[], key: string): CloudWordCount[] {
  return current.filter((item) => item.text !== key);
}

/** Сохраняет дельту к live-голосам (новые голоса участников продолжают накапливаться). */
export function setOptionVoteCountOverrideRow(
  current: OptionVoteCountOverride[],
  optionId: string,
  liveCount: number,
  nextDisplayCount: number,
): OptionVoteCountOverride[] {
  const safeLive = Math.max(0, Math.trunc(Number.isFinite(liveCount) ? liveCount : 0));
  const safeDisplay = Math.max(
    0,
    Math.trunc(Number.isFinite(nextDisplayCount) ? nextDisplayCount : 0),
  );
  const delta = safeDisplay - safeLive;
  const without = current.filter((item) => item.text !== optionId);
  if (delta === 0) return without;
  return [...without, { text: optionId, count: delta, mode: "delta" }];
}

/**
 * Порядок тегов для диалога результатов (как при живых данных + инжект + overrides).
 */
export function buildTagResultsDisplayOrder(params: {
  liveTags: CloudWordCount[];
  injected: CloudWordCount[];
  overrides: CloudWordCount[];
}): string[] {
  return buildCloudWordsForDisplay({
    liveTags: params.liveTags,
    hiddenTagTexts: [],
    injectedTagWords: params.injected,
    tagCountOverrides: params.overrides,
  }).map((item) => item.text);
}

type CloudManualQuestionFields = {
  id?: string;
  hiddenTagTexts?: string[];
  injectedTagWords?: CloudWordCount[];
  tagCountOverrides?: CloudWordCount[];
  optionVoteCountOverrides?: CloudWordCount[];
};

/** Применяет серверную карту ручных тегов ко всем question forms. */
export function applyCloudManualToQuestions<T extends CloudManualQuestionFields>(
  questions: T[],
  manual: CloudManualStateByQuestion,
): T[] {
  return questions.map((question) => {
    if (!question.id) return question;
    const entry = manual[question.id];
    return {
      ...question,
      hiddenTagTexts: entry?.hiddenTagTexts ?? [],
      injectedTagWords: entry?.injectedTagWords ?? [],
      tagCountOverrides: entry?.tagCountOverrides ?? [],
      optionVoteCountOverrides: entry?.optionVoteCountOverrides ?? [],
    };
  });
}

export function clearQuestionManualFields<T extends CloudManualQuestionFields>(question: T): T {
  return {
    ...question,
    hiddenTagTexts: [],
    injectedTagWords: [],
    tagCountOverrides: [],
    optionVoteCountOverrides: [],
  };
}

export function buildCloudManualFromQuestions(
  questions: CloudManualQuestionFields[],
): CloudManualStateByQuestion {
  const payload: CloudManualStateByQuestion = {};
  questions.forEach((question) => {
    if (!question.id) return;
    const hiddenTagTexts = question.hiddenTagTexts ?? [];
    const injectedTagWords = question.injectedTagWords ?? [];
    const tagCountOverrides = question.tagCountOverrides ?? [];
    const optionVoteCountOverrides = question.optionVoteCountOverrides ?? [];
    if (
      hiddenTagTexts.length === 0 &&
      injectedTagWords.length === 0 &&
      tagCountOverrides.length === 0 &&
      optionVoteCountOverrides.length === 0
    ) {
      return;
    }
    payload[question.id] = {
      hiddenTagTexts,
      injectedTagWords,
      tagCountOverrides,
      optionVoteCountOverrides,
    };
  });
  return payload;
}

export function readCloudManualFromPublicView(publicView: unknown): CloudManualStateByQuestion {
  if (!publicView || typeof publicView !== "object" || Array.isArray(publicView)) return {};
  const manual = (publicView as { tagCloudManualByQuestionId?: unknown })
    .tagCloudManualByQuestionId;
  return sanitizeTagCloudManualByQuestionId(manual);
}
