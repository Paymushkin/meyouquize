/** Лимит выбора для multi. Legacy: maxAnswers=1 сохранялся всегда — считаем «без лимита». */
export function resolveMultiMaxAnswers(
  maxAnswers: number | null | undefined,
  optionCount: number,
  hardCap = 5,
): number {
  const options = Math.max(1, Math.trunc(optionCount) || 1);
  const raw = Math.trunc(Number(maxAnswers)) || 0;
  const cap = Math.max(1, Math.trunc(hardCap) || 1);
  // ≤1 — legacy; ≥ числа вариантов — без лимита.
  if (raw <= 1 || raw >= options) return options;
  return Math.min(cap, options, raw);
}
