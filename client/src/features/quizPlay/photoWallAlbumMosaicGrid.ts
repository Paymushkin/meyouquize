/** Мозаичная сетка альбома: 1×1 и крупный 2×2, крупные чередуются слева/справа. */
export const photoWallAlbumMosaicGridSx = {
  display: "grid",
  gridAutoFlow: "dense",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gridAutoRows: "minmax(96px, 28cqw)",
  gap: 0.75,
  "& > .pw-mosaic-cell": {
    gridColumn: "span 1",
    gridRow: "span 1",
  },
  /** Крупный слева: колонки 1–2 */
  "& > .pw-mosaic-cell:nth-child(10n + 1)": {
    gridColumn: "1 / span 2",
    gridRow: "span 2",
  },
  /** Крупный справа: колонки 2–3 */
  "& > .pw-mosaic-cell:nth-child(10n + 6)": {
    gridColumn: "2 / span 2",
    gridRow: "span 2",
  },
  "@container (min-width: 420px)": {
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gridAutoRows: "minmax(104px, 22cqw)",
    gap: 1,
    "& > .pw-mosaic-cell": {
      gridColumn: "span 1",
      gridRow: "span 1",
    },
    /** Крупный слева: колонки 1–2 */
    "& > .pw-mosaic-cell:nth-child(10n + 1)": {
      gridColumn: "1 / span 2",
      gridRow: "span 2",
    },
    /** Крупный справа: колонки 3–4 */
    "& > .pw-mosaic-cell:nth-child(10n + 6)": {
      gridColumn: "3 / span 2",
      gridRow: "span 2",
    },
  },
} as const;
