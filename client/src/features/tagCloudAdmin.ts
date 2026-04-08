import type { CloudWordCount } from "@meyouquize/shared";

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
      const text = match[1].trim();
      const count = Number.parseInt(match[2], 10);
      if (!text || !Number.isFinite(count) || count < 1) return;
      map.set(text, (map.get(text) ?? 0) + count);
    });
  return Array.from(map.entries()).map(([text, count]) => ({ text, count }));
}

/** Сливает распарсенные строки с уже сохранёнными injected-словами (суммирует count по text). */
export function mergeInjectedTagWords(existing: CloudWordCount[], parsed: CloudWordCount[]): CloudWordCount[] {
  const nextWords = [...existing];
  parsed.forEach((item) => {
    const idx = nextWords.findIndex((w) => w.text === item.text);
    if (idx === -1) nextWords.push(item);
    else nextWords[idx] = { text: item.text, count: nextWords[idx].count + item.count };
  });
  return nextWords;
}

export function toggleHiddenTagText(hidden: string[], tagText: string): string[] {
  return hidden.includes(tagText) ? hidden.filter((item) => item !== tagText) : [...hidden, tagText];
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

/**
 * Порядок тегов для диалога результатов (как при живых данных + инжект + overrides).
 */
export function buildTagResultsDisplayOrder(params: {
  liveTags: CloudWordCount[];
  injected: CloudWordCount[];
  overrides: CloudWordCount[];
}): string[] {
  const { liveTags, injected, overrides } = params;
  const merged = new Map<string, number>();
  [...liveTags, ...injected].forEach((item) => {
    merged.set(item.text, (merged.get(item.text) ?? 0) + item.count);
  });
  overrides.forEach((item) => {
    merged.set(item.text, item.count);
  });
  return Array.from(merged.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"))
    .map((item) => item.text);
}
