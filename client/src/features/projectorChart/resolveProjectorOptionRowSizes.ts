/** Раскладка вариантов на проекторе: число плиток в каждом ряду. */
export function resolveProjectorOptionRowSizes(optionCount: number): number[] {
  if (optionCount <= 0) return [];
  if (optionCount === 1) return [1];
  if (optionCount === 2) return [2];
  if (optionCount === 3) return [3];
  if (optionCount === 4) return [2, 2];

  const fullRowsOfThree = Math.floor(optionCount / 3);
  const remainder = optionCount % 3;

  if (remainder === 0) {
    return Array.from({ length: fullRowsOfThree }, () => 3);
  }
  if (remainder === 2) {
    return [...Array.from({ length: fullRowsOfThree }, () => 3), 2];
  }
  if (optionCount === 7) {
    return [3, 2, 2];
  }
  return [...Array.from({ length: fullRowsOfThree }, () => 3), 1];
}
