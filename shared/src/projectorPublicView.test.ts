import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  mergePublicViewState,
  normalizePublicViewState,
} from "./index.js";
import {
  projectorPublicViewChanged,
  isBrandingEmitGuardPublicViewStateKey,
  isPlayerOnlyPublicViewPatch,
  isPlayerOnlyPublicViewStateKey,
  pickProjectorPublicViewState,
} from "./projectorPublicView.js";

describe("projectorPublicViewChanged", () => {
  it("returns false when only player tile fields change", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      showVoteCount: true,
    });
    const next = mergePublicViewState(prev, {
      speakerTileVisible: true,
      speakerTileText: "Спикеры",
      speakerQuestionsEnabled: true,
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(false);
  });

  it("returns true when projector question settings change", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      showVoteCount: false,
    });
    const next = mergePublicViewState(prev, { showVoteCount: true });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("returns true when option vote count overrides change in tagCloudManualByQuestionId", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      tagCloudManualByQuestionId: {},
    });
    const next = mergePublicViewState(prev, {
      tagCloudManualByQuestionId: {
        q1: {
          hiddenTagTexts: [],
          injectedTagWords: [],
          tagCountOverrides: [],
          optionVoteCountOverrides: [{ text: "opt-1", count: 42 }],
        },
      },
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("returns true when tag cloud manual overrides change", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      tagCloudManualByQuestionId: {
        q1: { hiddenTagTexts: [], injectedTagWords: [], tagCountOverrides: [] },
      },
    });
    const next = mergePublicViewState(prev, {
      tagCountOverrides: [{ text: "opt-1", count: 3 }],
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("returns false when only playerVisibleResultQuestionIds changes", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
    });
    const next = mergePublicViewState(prev, {
      playerVisibleResultQuestionIds: ["q1"],
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(false);
  });

  it("returns true when debate series round bars toggle changes", () => {
    const prev = normalizePublicViewState({
      mode: "debate_series",
      questionId: "q1",
      debateSeriesId: "ser1",
      debateSeriesView: "cumulative",
      debateSeriesShowRounds: false,
    });
    const next = mergePublicViewState(prev, { debateSeriesShowRounds: true });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
    expect(pickProjectorPublicViewState(next).debateSeriesShowRounds).toBe(true);
    expect(pickProjectorPublicViewState(next).questionId).toBe("q1");
    expect(pickProjectorPublicViewState(next).debateSeriesId).toBe("ser1");
  });

  it("returns true when debate series option vote overrides change", () => {
    const prev = normalizePublicViewState({
      mode: "debate_series",
      questionId: "q1",
      debateSeriesId: "ser1",
      debateSeriesView: "cumulative",
      tagCloudManualByQuestionId: {},
    });
    const next = mergePublicViewState(prev, {
      tagCloudManualByQuestionId: {
        q1: {
          hiddenTagTexts: [],
          injectedTagWords: [],
          tagCountOverrides: [],
          optionVoteCountOverrides: [{ text: "opt-1", count: 5, mode: "delta" }],
        },
      },
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("returns false for identical views", () => {
    const view = normalizePublicViewState(DEFAULT_PUBLIC_VIEW_STATE);
    expect(projectorPublicViewChanged(view, view)).toBe(false);
  });

  it("detects player-only patches", () => {
    expect(
      isPlayerOnlyPublicViewPatch({
        quizId: "q1",
        speakerTileVisible: true,
        speakerQuestionsEnabled: true,
      }),
    ).toBe(true);
    expect(
      isPlayerOnlyPublicViewPatch({
        quizId: "q1",
        speakerTileVisible: true,
        mode: "question",
      }),
    ).toBe(false);
    expect(
      isPlayerOnlyPublicViewPatch({
        quizId: "q1",
        reactionsWidgets: [],
      }),
    ).toBe(true);
  });

  it("returns false when only reactions overlay changes in question mode", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      reactionsOverlayText: "Старый заголовок",
    });
    const next = mergePublicViewState(prev, { reactionsOverlayText: "Новый заголовок" });
    expect(projectorPublicViewChanged(prev, next)).toBe(false);
  });

  it("returns true when reactions overlay changes in reactions mode", () => {
    const prev = normalizePublicViewState({
      mode: "reactions",
      reactionsOverlayText: "Старый заголовок",
    });
    const next = mergePublicViewState(prev, { reactionsOverlayText: "Новый заголовок" });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("returns false when only reaction widget config changes in question mode", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      reactionsWidgets: [],
    });
    const next = mergePublicViewState(prev, {
      reactionsWidgets: [
        {
          id: "w1",
          title: "Виджет",
          reactions: ["👍"],
        },
      ],
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(false);
  });

  it("returns false when only randomizer settings change in question mode", () => {
    const prev = normalizePublicViewState({
      mode: "question",
      questionId: "q1",
      randomizerTitle: "Старый",
    });
    const next = mergePublicViewState(prev, { randomizerTitle: "Новый" });
    expect(projectorPublicViewChanged(prev, next)).toBe(false);
  });

  it("returns true when photo wall settings change", () => {
    const prev = normalizePublicViewState({ mode: "photo_wall", photoWallImageCount: 3 });
    const next = mergePublicViewState(prev, { photoWallImageCount: 5 });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("picks photo_wall mode keys for projector", () => {
    const view = normalizePublicViewState({
      mode: "photo_wall",
      photoWallBaseUrl: "https://storage.yandexcloud.net/b/w/",
      photoWallImageCount: 2,
    });
    const picked = pickProjectorPublicViewState(view);
    expect(picked.mode).toBe("photo_wall");
    expect(picked.photoWallImageCount).toBe(2);
    expect(picked.photoWallBaseUrl).toBe("https://storage.yandexcloud.net/b/w/");
  });

  it("returns true when video wall settings change", () => {
    const prev = normalizePublicViewState({
      mode: "video_wall",
      videoWallHorizontalItems: [{ id: "1", url: "https://example.com/a.mp4", title: "A" }],
    });
    const next = mergePublicViewState(prev, {
      videoWallHorizontalItems: [
        { id: "1", url: "https://example.com/a.mp4", title: "A" },
        { id: "2", url: "https://example.com/b.mp4", title: "B" },
      ],
    });
    expect(projectorPublicViewChanged(prev, next)).toBe(true);
  });

  it("picks video_wall mode keys for projector", () => {
    const view = normalizePublicViewState({
      mode: "video_wall",
      videoWallHorizontalItems: [{ id: "1", url: "https://example.com/a.mp4", title: "Горизонт" }],
      videoWallHorizontalPosterUrl: "https://example.com/h.jpg",
      videoWallVerticalItems: [{ id: "2", url: "https://example.com/b.mov", title: "Вертикаль" }],
      videoWallVerticalPosterUrl: "https://example.com/v.jpg",
    });
    const picked = pickProjectorPublicViewState(view);
    expect(picked.mode).toBe("video_wall");
    expect(picked.videoWallHorizontalItems).toHaveLength(1);
    expect(picked.videoWallVerticalItems).toHaveLength(1);
    expect(picked.videoWallHorizontalItems[0]?.title).toBe("Горизонт");
    expect(picked.videoWallHorizontalPosterUrl).toBeUndefined();
    expect(picked.videoWallVerticalPosterUrl).toBeUndefined();
  });
});

describe("isPlayerOnlyPublicViewStateKey", () => {
  it("recognizes player-only keys", () => {
    expect(isPlayerOnlyPublicViewStateKey("speakerTileVisible")).toBe(true);
    expect(isPlayerOnlyPublicViewStateKey("playerTilesGridColumns")).toBe(true);
    expect(isPlayerOnlyPublicViewStateKey("videoWallHorizontalPosterUrl")).toBe(true);
    expect(isPlayerOnlyPublicViewStateKey("videoWallVerticalPosterUrl")).toBe(true);
    expect(isPlayerOnlyPublicViewStateKey("projectorBackground")).toBe(false);
  });
});

describe("isBrandingEmitGuardPublicViewStateKey", () => {
  it("recognizes branding keys", () => {
    expect(isBrandingEmitGuardPublicViewStateKey("brandPrimaryColor")).toBe(true);
    expect(isBrandingEmitGuardPublicViewStateKey("appliedEventThemeKey")).toBe(true);
    expect(isBrandingEmitGuardPublicViewStateKey("mode")).toBe(false);
  });
});
