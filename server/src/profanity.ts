import { PROFANITY_RU } from "./profanity-dictionary.js";

function isWordChar(c: string): boolean {
  return /[\p{L}\p{N}_]/u.test(c);
}

function normalizeInput(s: string): string {
  return s.toLowerCase().normalize("NFKC").replace(/ё/g, "е");
}

/**
 * Ищет слова из словаря как отдельные лексемы (не подстроку внутри другого слова).
 */
export function containsProfanity(text: string): boolean {
  const normalized = normalizeInput(text);
  const bounded = ` ${normalized} `;
  for (const word of PROFANITY_RU) {
    const needle = normalizeInput(word);
    if (needle.length === 0) continue;
    let from = 0;
    while (from < bounded.length) {
      const i = bounded.indexOf(needle, from);
      if (i === -1) break;
      const before = bounded[i - 1] ?? " ";
      const after = bounded[i + needle.length] ?? " ";
      if (!isWordChar(before) && !isWordChar(after)) {
        return true;
      }
      from = i + 1;
    }
  }
  return false;
}

export function assertNoProfanity(text: string): void {
  if (containsProfanity(text)) {
    throw new Error("Текст содержит недопустимые выражения");
  }
}

export function assertNoProfanityInTags(tags: string[] | undefined): void {
  if (!tags?.length) return;
  for (const t of tags) {
    assertNoProfanity(t);
  }
}
