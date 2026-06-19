export const TEMPERATURE_SCALE_MIN = 0;
export const TEMPERATURE_SCALE_MAX = 100;

/** Веса по умолчанию при создании вопроса «Измерение температуры» в админке. */
export const DEFAULT_TEMPERATURE_OPTION_WEIGHTS = [25, 50, 75, 100] as const;

export function clampTemperatureScaleValue(value: number): number {
  if (!Number.isFinite(value)) return TEMPERATURE_SCALE_MIN;
  return Math.max(TEMPERATURE_SCALE_MIN, Math.min(TEMPERATURE_SCALE_MAX, value));
}

export function roundTemperatureScaleValue(value: number): number {
  return Math.round(clampTemperatureScaleValue(value) * 10) / 10;
}

export type FormatTemperatureScaleValueOptions = {
  /** Всегда один знак после запятой (стабильная ширина на проекторе). */
  fixedDecimals?: boolean;
};

export function formatTemperatureScaleValue(
  value: number | null | undefined,
  options?: FormatTemperatureScaleValueOptions,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = roundTemperatureScaleValue(value);
  if (options?.fixedDecimals) return rounded.toFixed(1);
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

export function formatTemperatureScaleLabel(
  value: number | null | undefined,
  options?: FormatTemperatureScaleValueOptions,
): string | null {
  const formatted = formatTemperatureScaleValue(value, options);
  return formatted != null ? `${formatted} / 100` : null;
}

/** Средневзвешенное значение шкалы температуры по голосам (0–100, округление до 0.1). */
export function computeTemperatureWeightedAverage(
  stats: ReadonlyArray<{ count: number; weight: number }>,
): number | null {
  let weightedSum = 0;
  let totalCount = 0;
  for (const row of stats) {
    const count = row.count;
    if (!Number.isFinite(count) || count <= 0) continue;
    const weight = row.weight;
    if (!Number.isFinite(weight)) continue;
    weightedSum += weight * count;
    totalCount += count;
  }
  if (totalCount <= 0) return null;
  return roundTemperatureScaleValue(weightedSum / totalCount);
}
