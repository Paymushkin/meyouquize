import type { PublicViewState, SpeakerQuestionSession } from "@meyouquize/shared";
import { getStringArrayOrNull } from "../../utils/unknownGuards";

export type AdminSpeakerSessionDraft = {
  id: string;
  name: string;
  speakersText: string;
};

/** Значения формы «Вопросы спикерам» в админке (сохранение + панель настроек). */
export type AdminSpeakerQuestionsSettingsValues = {
  enabled: boolean;
  reactionsText: string;
  showAuthorOnScreen: boolean;
  showRecipientOnScreen: boolean;
  showReactionsOnScreen: boolean;
  allowAllSpeakersTarget: boolean;
  /** false = на /s только APPROVED; true = все вопросы */
  moderatorShowAll: boolean;
  sessions: AdminSpeakerSessionDraft[];
  activeSpeakerSessionId: string | null;
};

/** Колбэки панели настроек (переключатели и текстовые поля). */
export type AdminSpeakerQuestionsPanelActions = {
  onToggleEnabled: (next: boolean) => void;
  onReactionsTextChange: (next: string) => void;
  onToggleShowAuthorOnScreen: (next: boolean) => void;
  onToggleShowRecipientOnScreen: (next: boolean) => void;
  onToggleShowReactionsOnScreen: (next: boolean) => void;
  onToggleAllowAllSpeakersTarget: (next: boolean) => void;
  onToggleModeratorShowAll: (next: boolean) => void;
  onSessionsChange: (next: AdminSpeakerSessionDraft[]) => void;
  onPersistSessions: (
    next: AdminSpeakerSessionDraft[],
    activeSpeakerSessionId?: string | null,
  ) => void;
  onActiveSpeakerSessionIdChange: (next: string | null) => void;
  onSaveSettings: () => void;
  moderatorPageUrl?: string;
};

type SpeakerQuestionsPublicSlice = Partial<
  Pick<
    PublicViewState,
    | "speakerQuestionsEnabled"
    | "speakerQuestionsReactions"
    | "speakerQuestionsShowAuthorOnScreen"
    | "speakerQuestionsShowRecipientOnScreen"
    | "speakerQuestionsShowReactionsOnScreen"
    | "speakerQuestionsAllowAllSpeakersTarget"
    | "speakerQuestionsModeratorShowAll"
    | "speakerQuestionSessions"
    | "activeSpeakerSessionId"
    | "speakerQuestionsSpeakers"
  >
>;

export function sessionsToDrafts(sessions: SpeakerQuestionSession[]): AdminSpeakerSessionDraft[] {
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    speakersText: s.speakers.join("\n"),
  }));
}

export function draftsToSessions(drafts: AdminSpeakerSessionDraft[]): SpeakerQuestionSession[] {
  return drafts.map((d) => ({
    id: d.id,
    name: d.name.trim() || "Сессия",
    speakers: d.speakersText
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
  }));
}

/** Включение, список реакций и три флага «на экране» — при загрузке комнаты из `publicView`. */
export function applySpeakerQuestionsAdminFieldsFromPublicView(
  view: SpeakerQuestionsPublicSlice,
  actions: {
    setEnabled: (v: boolean) => void;
    setReactionsText: (v: string) => void;
    setShowAuthorOnScreen: (v: boolean) => void;
    setShowRecipientOnScreen: (v: boolean) => void;
    setShowReactionsOnScreen: (v: boolean) => void;
    setAllowAllSpeakersTarget: (v: boolean) => void;
    setModeratorShowAll: (v: boolean) => void;
  },
): void {
  if (typeof view.speakerQuestionsEnabled === "boolean") {
    actions.setEnabled(view.speakerQuestionsEnabled);
  }
  const reactions = getStringArrayOrNull(view.speakerQuestionsReactions);
  if (reactions) {
    actions.setReactionsText(reactions.join("\n"));
  }
  if (typeof view.speakerQuestionsAllowAllSpeakersTarget === "boolean") {
    actions.setAllowAllSpeakersTarget(view.speakerQuestionsAllowAllSpeakersTarget);
  }
  if (typeof view.speakerQuestionsModeratorShowAll === "boolean") {
    actions.setModeratorShowAll(view.speakerQuestionsModeratorShowAll);
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
