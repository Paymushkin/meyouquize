import type { PublicViewState } from "@meyouquize/shared";
import { getStringArrayOrNull } from "../../utils/unknownGuards";

/** Значения формы «Вопросы спикерам» в админке (сохранение + панель настроек). */
export type AdminSpeakerQuestionsSettingsValues = {
  enabled: boolean;
  reactionsText: string;
  showAuthorOnScreen: boolean;
  showRecipientOnScreen: boolean;
  showReactionsOnScreen: boolean;
  speakersText: string;
};

/** Колбэки панели настроек (переключатели и текстовые поля). */
export type AdminSpeakerQuestionsPanelActions = {
  onToggleEnabled: (next: boolean) => void;
  onReactionsTextChange: (next: string) => void;
  onToggleShowAuthorOnScreen: (next: boolean) => void;
  onToggleShowRecipientOnScreen: (next: boolean) => void;
  onToggleShowReactionsOnScreen: (next: boolean) => void;
  onSpeakersTextChange: (next: string) => void;
  onSaveSettings: () => void;
};

type SpeakerQuestionsPublicSlice = Partial<
  Pick<
    PublicViewState,
    | "speakerQuestionsEnabled"
    | "speakerQuestionsReactions"
    | "speakerQuestionsShowAuthorOnScreen"
    | "speakerQuestionsShowRecipientOnScreen"
    | "speakerQuestionsShowReactionsOnScreen"
  >
>;

/** Включение, список реакций и три флага «на экране» — при загрузке комнаты из `publicView`. */
export function applySpeakerQuestionsAdminFieldsFromPublicView(
  view: SpeakerQuestionsPublicSlice,
  actions: {
    setEnabled: (v: boolean) => void;
    setReactionsText: (v: string) => void;
    setShowAuthorOnScreen: (v: boolean) => void;
    setShowRecipientOnScreen: (v: boolean) => void;
    setShowReactionsOnScreen: (v: boolean) => void;
  },
): void {
  if (typeof view.speakerQuestionsEnabled === "boolean") {
    actions.setEnabled(view.speakerQuestionsEnabled);
  }
  const reactions = getStringArrayOrNull(view.speakerQuestionsReactions);
  if (reactions) {
    actions.setReactionsText(reactions.join("\n"));
  }
  applySpeakerQuestionsScreenVisibilityFromView(view, actions);
}

/** Только флаги отображения на экране — для `results:public:view` без трогания включения/реакций. */
export function applySpeakerQuestionsScreenVisibilityFromView(
  view: SpeakerQuestionsPublicSlice,
  actions: {
    setShowAuthorOnScreen: (v: boolean) => void;
    setShowRecipientOnScreen: (v: boolean) => void;
    setShowReactionsOnScreen: (v: boolean) => void;
  },
): void {
  if (typeof view.speakerQuestionsShowAuthorOnScreen === "boolean") {
    actions.setShowAuthorOnScreen(view.speakerQuestionsShowAuthorOnScreen);
  }
  if (typeof view.speakerQuestionsShowRecipientOnScreen === "boolean") {
    actions.setShowRecipientOnScreen(view.speakerQuestionsShowRecipientOnScreen);
  }
  if (typeof view.speakerQuestionsShowReactionsOnScreen === "boolean") {
    actions.setShowReactionsOnScreen(view.speakerQuestionsShowReactionsOnScreen);
  }
}
