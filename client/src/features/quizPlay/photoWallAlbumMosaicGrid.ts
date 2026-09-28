/** Мозаичная сетка альбома фотостены (CSS Grid + dense). */
export const photoWallAlbumMosaicGridSx = {
  display: "grid",
  gridAutoFlow: "dense",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gridAutoRows: "minmax(96px, 28cqw)",
  gap: 0.75,
  /** База 3 колонки: крупный квадрат, высокий, широкий */
  "& > .pw-mosaic-cell": {
    gridColumn: "span 1",
    gridRow: "span 1",
  },
  "& > .pw-mosaic-cell:nth-child(7n + 1)": {
    gridColumn: "span 2",
    gridRow: "span 2",
  },
  "& > .pw-mosaic-cell:nth-child(7n + 3)": {
    gridRow: "span 2",
  },
  "& > .pw-mosaic-cell:nth-child(7n + 6)": {
    gridColumn: "span 2",
  },
  /** Шире ~420px контейнера — 4 колонки и другой ритм */
  "@container (min-width: 420px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gridAutoRows: "minmax(104px, 22cqw)",
    gap: 1,
    "& > .pw-mosaic-cell": {
      gridColumn: "span 1",
      gridRow: "span 1",
    },
    "& > .pw-mosaic-cell:nth-child(8n + 1)": {
      gridColumn: "span 2",
      gridRow: "span 2",
    },
    "& > .pw-mosaic-cell:nth-child(8n + 4)": {
      gridRow: "span 2",
    },
    "& > .pw-mosaic-cell:nth-child(8n + 6)": {
      gridColumn: "span 2",
    },
    "& > .pw-mosaic-cell:nth-child(8n + 7)": {
      gridRow: "span 2",
    },
  },
} as const;
