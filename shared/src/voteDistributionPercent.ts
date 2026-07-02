const voteDistributionPercentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Процент доли голосов для отчётов: целое без дроби, иначе одна цифра после запятой. */
export function formatVoteDistributionPercent(count: number, total: number): string {
  if (total <= 0 || count <= 0) return "0%";
  const percent = (count / total) * 100;
  return `${voteDistributionPercentFormatter.format(percent)}%`;
}

/** Точная доля в процентах для ширины полосы графика. */
export function voteDistributionPercentWidth(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  return (count / total) * 100;
}
