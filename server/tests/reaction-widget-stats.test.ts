import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";

const getStoredPublicView = vi.fn();
const saveStoredPublicView = vi.fn();

vi.mock("../src/socket/public-view-store.js", () => ({
  getStoredPublicView,
  saveStoredPublicView,
}));

const { persistReactionWidgetCounts } = await import("../src/reaction-widget-stats.js");

describe("persistReactionWidgetCounts", () => {
  beforeEach(() => {
    getStoredPublicView.mockReset();
    saveStoredPublicView.mockReset();
  });

  it("no-ops when quiz has no reaction widgets", async () => {
    getStoredPublicView.mockResolvedValue({ ...DEFAULT_PUBLIC_VIEW_STATE, reactionsWidgets: [] });
    await persistReactionWidgetCounts("quiz-1", ["👍"], { "👍": 3 });
    expect(saveStoredPublicView).not.toHaveBeenCalled();
  });

  it("persists counts for widget matched by overlay title", async () => {
    getStoredPublicView.mockResolvedValue({
      ...DEFAULT_PUBLIC_VIEW_STATE,
      reactionsOverlayText: "Реакции",
      reactionsWidgets: [{ id: "w1", title: "Реакции", reactions: ["👍", "❤️"] }],
      reactionsWidgetStats: [],
    });
    await persistReactionWidgetCounts("quiz-1", ["👍", "❤️"], { "👍": 2, "❤️": -1 });
    expect(saveStoredPublicView).toHaveBeenCalledWith(
      "quiz-1",
      expect.objectContaining({
        reactionsWidgetStats: [{ widgetId: "w1", counts: { "👍": 2, "❤️": 0 } }],
      }),
    );
  });
});
