import { describe, expect, it } from "vitest";
import { normalizePublicViewState } from "@meyouquize/shared";
import { getStoredPublicView } from "../../src/socket/public-view-store.js";
import { saveStoredPublicView } from "../../src/socket/public-view-store.js";
import { seedSingleChoiceQuiz, uniqueSlug } from "../helpers/integrationFixtures.js";

describe("photo wall public view integration", () => {
  it("persists photo wall settings in stored public view", async () => {
    const { quizId } = await seedSingleChoiceQuiz(uniqueSlug("photo-wall"));
    const baseUrl = "https://storage.yandexcloud.net/bucket/event/photowall/";
    await saveStoredPublicView(quizId, {
      ...normalizePublicViewState({}),
      mode: "photo_wall",
      photoWallBaseUrl: baseUrl,
      photoWallImageCount: 5,
      photoWallImageExt: "jpeg",
      photoWallGridColumns: 4,
      photoWallAnimate: true,
      photoWallKenBurns: false,
    });

    const stored = await getStoredPublicView(quizId);
    expect(stored.mode).toBe("photo_wall");
    expect(stored.photoWallBaseUrl).toBe(baseUrl);
    expect(stored.photoWallImageCount).toBe(5);
    expect(stored.photoWallImageExt).toBe("jpeg");
    expect(stored.photoWallGridColumns).toBe(4);
    expect(stored.photoWallAnimate).toBe(true);
    expect(stored.photoWallKenBurns).toBe(false);
  });
});
