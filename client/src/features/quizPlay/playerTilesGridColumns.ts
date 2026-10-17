/** ≤420px контейнера: даже при настройке «3» показываем 2 колонки. */
export const PLAYER_TILES_THREE_COL_MIN_CONTAINER_PX = 421;

export type PlayerTilesGridColumns = 2 | 3;

/** Стили `gridTemplateColumns` для плиток игрока. */
export function buildPlayerTilesGridColumnsSx(gridColumns: PlayerTilesGridColumns) {
  if (gridColumns === 2) {
    return { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" as const };
  }
  return {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))" as const,
    [`@container (min-width: ${PLAYER_TILES_THREE_COL_MIN_CONTAINER_PX}px)`]: {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))" as const,
    },
  };
}
