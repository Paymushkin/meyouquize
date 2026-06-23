type CloudWordCount = { text: string; count: number };

type BuildCloudWordsParams = {
  liveTags: CloudWordCount[];
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
};

/** Слияние живых тегов с ручными правками (как в админке и на проекторе). */
export function buildCloudWordsForDisplay(params: BuildCloudWordsParams): CloudWordCount[] {
  const { liveTags, hiddenTagTexts, injectedTagWords, tagCountOverrides } = params;
  const baseLive = liveTags.filter((item) => !hiddenTagTexts.includes(item.text));
  const merged = new Map<string, number>();
  baseLive.forEach((item) => {
    merged.set(item.text, (merged.get(item.text) ?? 0) + item.count);
  });
  injectedTagWords.forEach((item) => {
    if (hiddenTagTexts.includes(item.text)) return;
    merged.set(item.text, (merged.get(item.text) ?? 0) + item.count);
  });
  tagCountOverrides.forEach((item) => {
    merged.set(item.text, item.count);
  });

  const computed = Array.from(merged.entries())
    .map(([text, count]) => ({ text, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));

  if (computed.length === 0 && baseLive.length > 0) {
    return [...baseLive].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));
  }
  return computed;
}
