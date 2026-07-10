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
});

describe("isPlayerOnlyPublicViewStateKey", () => {
  it("recognizes player-only keys", () => {
    expect(isPlayerOnlyPublicViewStateKey("speakerTileVisible")).toBe(true);
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
