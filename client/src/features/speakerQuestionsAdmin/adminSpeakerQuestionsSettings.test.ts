import { describe, expect, it, vi } from "vitest";
import {
  applySpeakerQuestionsAdminFieldsFromPublicView,
  applySpeakerQuestionsScreenVisibilityFromView,
} from "./adminSpeakerQuestionsSettings";

describe("applySpeakerQuestionsScreenVisibilityFromView", () => {
  it("вызывает только переданные булевы поля", () => {
    const setAuthor = vi.fn();
    const setRecipient = vi.fn();
    const setReactions = vi.fn();
    applySpeakerQuestionsScreenVisibilityFromView(
      { speakerQuestionsShowRecipientOnScreen: false },
      {
        setShowAuthorOnScreen: setAuthor,
        setShowRecipientOnScreen: setRecipient,
        setShowReactionsOnScreen: setReactions,
      },
    );
    expect(setAuthor).not.toHaveBeenCalled();
    expect(setRecipient).toHaveBeenCalledWith(false);
    expect(setReactions).not.toHaveBeenCalled();
  });
});

describe("applySpeakerQuestionsAdminFieldsFromPublicView", () => {
  it("подтягивает реакции из массива в текст", () => {
    const setReactionsText = vi.fn();
    applySpeakerQuestionsAdminFieldsFromPublicView(
      { speakerQuestionsReactions: ["👍", "🔥"] },
      {
        setEnabled: vi.fn(),
        setReactionsText,
        setShowAuthorOnScreen: vi.fn(),
        setShowRecipientOnScreen: vi.fn(),
        setShowReactionsOnScreen: vi.fn(),
      },
    );
    expect(setReactionsText).toHaveBeenCalledWith("👍\n🔥");
  });
});
