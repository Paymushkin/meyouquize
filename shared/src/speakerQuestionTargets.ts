/** Вопрос «всем спикерам» (сохраняется в БД). */
export const SPEAKER_ALL_TARGET = "Все спикеры";

/** Вопрос без выбранного спикера (сохраняется в БД). */
export const SPEAKER_NOT_SELECTED = "не выбрано";

export function isKnownSpeakerTargetValue(
  speakerName: string,
  speakers: readonly string[],
): boolean {
  const trimmed = speakerName.trim();
  if (!trimmed) return false;
  if (trimmed === SPEAKER_ALL_TARGET || trimmed === SPEAKER_NOT_SELECTED) return true;
  return speakers.includes(trimmed);
}

/** Не показывать подпись «кому» у игроков и на проекторе. */
export function isSpeakerRecipientHiddenFromAudience(speakerName: string): boolean {
  return speakerName.trim() === SPEAKER_NOT_SELECTED;
}

export function shouldShowSpeakerRecipientToAudience(speakerName: string): boolean {
  return !isSpeakerRecipientHiddenFromAudience(speakerName);
}
