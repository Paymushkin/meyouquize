import {
  SPEAKER_ALL_TARGET,
  SPEAKER_NOT_SELECTED,
  shouldShowSpeakerRecipientToAudience,
} from "@meyouquize/shared";

/** Пустое значение в select — «спикер не выбран» в UI. */
export const SPEAKER_UI_UNSELECTED = "";

export const SPEAKER_SELECT_PLACEHOLDER_LABEL = "Выбрать спикера";

export const SPEAKER_ALL_TARGET_LABEL = "Всем спикерам";

export function resolveSpeakerNameForCreate(
  uiValue: string,
  allowAllSpeakersTarget: boolean,
): string {
  const trimmed = uiValue.trim();
  if (allowAllSpeakersTarget) {
    return trimmed || SPEAKER_ALL_TARGET;
  }
  return trimmed || SPEAKER_NOT_SELECTED;
}

export function normalizeSpeakerUiSelection(
  uiValue: string,
  allowAllSpeakersTarget: boolean,
  speakers: readonly string[],
): string {
  if (allowAllSpeakersTarget) {
    if (uiValue === SPEAKER_ALL_TARGET || speakers.includes(uiValue)) return uiValue;
    return SPEAKER_ALL_TARGET;
  }
  const first = speakers[0] ?? SPEAKER_UI_UNSELECTED;
  if (uiValue === SPEAKER_ALL_TARGET || !uiValue) return first;
  if (speakers.includes(uiValue)) return uiValue;
  return first;
}

export function speakerQuestionRecipientLabel(speakerName: string): string {
  if (speakerName === SPEAKER_ALL_TARGET) return "Для всех спикеров";
  return `Для: ${speakerName}`;
}

/** Подпись адресата в списке вопросов у игрока; для «не выбрано» — скрыть. */
export function speakerQuestionRecipientLabelForAudience(speakerName: string): string | null {
  if (!shouldShowSpeakerRecipientToAudience(speakerName)) return null;
  return speakerQuestionRecipientLabel(speakerName);
}
