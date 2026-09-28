import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE, type PublicViewPayload } from "@meyouquize/shared";
import { applyAdminPlayerTilesFromPublicView } from "./adminPlayerTilesFromPublicView";

function makeSetters() {
  return {
    setShowEventTitleOnPlayer: vi.fn(),
    setPlayerAutoJoinRandomNickname: vi.fn(),
    setSpeakerTileText: vi.fn(),
    setSpeakerTileBackgroundColor: vi.fn(),
    setSpeakerTileTextColor: vi.fn(),
    setSpeakerTileVisible: vi.fn(),
    setProgramTileText: vi.fn(),
    setProgramTileBackgroundColor: vi.fn(),
    setProgramTileTextColor: vi.fn(),
    setProgramTileLinkUrl: vi.fn(),
    setProgramTileVisible: vi.fn(),
    setPlayerQuizResultsTileText: vi.fn(),
    setPlayerQuizResultsTileBackgroundColor: vi.fn(),
    setPlayerQuizResultsTileTextColor: vi.fn(),
    setPlayerQuizResultsSubQuizId: vi.fn(),
    setPlayerQuizResultsSubQuizIds: vi.fn(),
    setPlayerQuizResultsTileVisible: vi.fn(),
    setPlayerTilesOrder: vi.fn(),
    setPlayerTilesGridColumns: vi.fn(),
  };
}

describe("applyAdminPlayerTilesFromPublicView", () => {
  it("applies playerTilesGridColumns when 2 or 3", () => {
    const setters = makeSetters();
    applyAdminPlayerTilesFromPublicView(
      { ...DEFAULT_PUBLIC_VIEW_STATE, playerTilesGridColumns: 2 } as PublicViewPayload,
      [],
      setters,
    );
    expect(setters.setPlayerTilesGridColumns).toHaveBeenCalledWith(2);
  });

  it("ignores invalid playerTilesGridColumns", () => {
    const setters = makeSetters();
    applyAdminPlayerTilesFromPublicView(
      { ...DEFAULT_PUBLIC_VIEW_STATE, playerTilesGridColumns: 4 as 2 | 3 } as PublicViewPayload,
      [],
      setters,
    );
    expect(setters.setPlayerTilesGridColumns).not.toHaveBeenCalled();
  });
});
