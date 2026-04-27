export function colorByWord(word: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) hash = (hash << 5) - hash + word.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length] ?? "#1f1f1f";
}
