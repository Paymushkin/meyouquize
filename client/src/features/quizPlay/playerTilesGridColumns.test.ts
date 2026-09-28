import { describe, expect, it } from "vitest";
import {
  PLAYER_TILES_THREE_COL_MIN_CONTAINER_PX,
  buildPlayerTilesGridColumnsSx,
} from "./playerTilesGridColumns";

describe("buildPlayerTilesGridColumnsSx", () => {
  it("keeps two columns when setting is 2", () => {
    expect(buildPlayerTilesGridColumnsSx(2)).toEqual({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    });
  });

  it("forces two columns below 421px container when setting is 3", () => {
    expect(PLAYER_TILES_THREE_COL_MIN_CONTAINER_PX).toBe(421);
    expect(buildPlayerTilesGridColumnsSx(3)).toEqual({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      "@container (min-width: 421px)": {
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      },
    });
  });
});
