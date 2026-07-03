/** Сравнение тегов облака: NFKC, регистр, пробелы, завершающая точка. Согласовано с зачётом ответов. */
export function normalizeTagComparable(value: string): string {
  let s = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\.+$/u, "").trim();
  return s;
}
