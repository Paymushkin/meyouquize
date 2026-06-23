import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";

const getStoredPublicView = vi.fn();
const saveStoredPublicView = vi.fn();

vi.mock("../src/socket/public-view-store.js", () => ({
  getStoredPublicView,
  saveStoredPublicView,
}));

const { persistBannerUniqueClick } = await import("../src/banner-click-stats.js");

describe("persistBannerUniqueClick", () => {
  beforeEach(() => {
    getStoredPublicView.mockReset();
    saveStoredPublicView.mockReset();
  });

  it("records first unique click for visible banner", async () => {
    getStoredPublicView.mockResolvedValue({
      ...DEFAULT_PUBLIC_VIEW_STATE,
      playerBanners: [
        {
          id: "b1",
          linkUrl: "https://example.com",
          backgroundUrl: "https://example.com/bg.png",
          size: "1x1",
          isVisible: true,
        },
      ],
      playerBannerClickStats: [],
      playerBannerClickParticipantIds: {},
    });

    const recorded = await persistBannerUniqueClick("quiz-1", "b1", "p1");
    expect(recorded).toBe(true);
    expect(saveStoredPublicView).toHaveBeenCalledWith(
      "quiz-1",
      expect.objectContaining({
        playerBannerClickStats: [{ bannerId: "b1", uniqueClicks: 1 }],
        playerBannerClickParticipantIds: { b1: ["p1"] },
      }),
    );
  });

  it("ignores duplicate click from same participant", async () => {
    getStoredPublicView.mockResolvedValue({
      ...DEFAULT_PUBLIC_VIEW_STATE,
      playerBanners: [
        {
          id: "b1",
          linkUrl: "https://example.com",
          backgroundUrl: "https://example.com/bg.png",
          size: "1x1",
          isVisible: true,
        },
      ],
      playerBannerClickStats: [{ bannerId: "b1", uniqueClicks: 1 }],
      playerBannerClickParticipantIds: { b1: ["p1"] },
    });

    const recorded = await persistBannerUniqueClick("quiz-1", "b1", "p1");
    expect(recorded).toBe(false);
    expect(saveStoredPublicView).not.toHaveBeenCalled();
  });

  it("ignores clicks on hidden banners", async () => {
    getStoredPublicView.mockResolvedValue({
      ...DEFAULT_PUBLIC_VIEW_STATE,
      playerBanners: [
        {
          id: "b1",
          linkUrl: "https://example.com",
          backgroundUrl: "https://example.com/bg.png",
          size: "1x1",
          isVisible: false,
        },
      ],
      playerBannerClickStats: [],
      playerBannerClickParticipantIds: {},
    });

    const recorded = await persistBannerUniqueClick("quiz-1", "b1", "p1");
    expect(recorded).toBe(false);
    expect(saveStoredPublicView).not.toHaveBeenCalled();
  });
});
