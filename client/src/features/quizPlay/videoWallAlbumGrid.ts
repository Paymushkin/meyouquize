/** Сетка горизонтальных роликов: 16:9, 2 колонки. */
export const videoWallHorizontalGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 1,
} as const;

/** Сетка вертикальных роликов: 9:16, 3 колонки. */
export const videoWallVerticalGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 1,
} as const;
