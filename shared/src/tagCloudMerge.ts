import { normalizeTagComparable } from "./tagCloudText.js";

type CloudWordCount = { text: string; count: number };

type BuildCloudWordsParams = {
  liveTags: CloudWordCount[];
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
};

function tagCloudCanonicalKey(text: string): string {
  return normalizeTagComparable(text);
}

function isHiddenTag(text: string, hiddenTagTexts: string[]): boolean {
  const key = tagCloudCanonicalKey(text);
  if (!key) return false;
  return hiddenTagTexts.some((hidden) => tagCloudCanonicalKey(hidden) === key);
}

function addCloudWordCount(merged: Map<string, CloudWordCount>, text: string, count: number): void {
  const key = tagCloudCanonicalKey(text);
  if (!key || count <= 0) return;
  const existing = merged.get(key);
  if (existing) {
    existing.count += count;
    return;
  }
  merged.set(key, { text: key, count });
}

function setCloudWordCountOverride(
  merged: Map<string, CloudWordCount>,
  text: string,
  count: number,
): void {
  const key = tagCloudCanonicalKey(text);
  if (!key) return;
  merged.set(key, { text: key, count: Math.max(0, Math.trunc(count)) });
}

function sortCloudWords(words: CloudWordCount[]): CloudWordCount[] {
  return [...words]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));
}

/** Суммирует теги по нормализованному ключу (без учёта регистра). */
export function aggregateTagCloudWordCounts(items: Iterable<CloudWordCount>): CloudWordCount[] {
  const merged = new Map<string, CloudWordCount>();
  for (const item of items) {
    addCloudWordCount(merged, item.text, item.count);
  }
  return sortCloudWords(Array.from(merged.values()));
}

/** Слияние живых тегов с ручными правками (как в админке и на проекторе). */
export function buildCloudWordsForDisplay(params: BuildCloudWordsParams): CloudWordCount[] {
  const { liveTags, hiddenTagTexts, injectedTagWords, tagCountOverrides } = params;
  const baseLive = liveTags.filter((item) => !isHiddenTag(item.text, hiddenTagTexts));
  const merged = new Map<string, CloudWordCount>();

  baseLive.forEach((item) => addCloudWordCount(merged, item.text, item.count));
  injectedTagWords.forEach((item) => {
    if (isHiddenTag(item.text, hiddenTagTexts)) return;
    addCloudWordCount(merged, item.text, item.count);
  });
  tagCountOverrides.forEach((item) => setCloudWordCountOverride(merged, item.text, item.count));

  const computed = sortCloudWords(Array.from(merged.values()));
  if (computed.length === 0 && baseLive.length > 0) {
    return aggregateTagCloudWordCounts(baseLive);
  }
  return computed;
}
