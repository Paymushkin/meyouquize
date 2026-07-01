import { SPEAKER_ALL_TARGET, shouldShowSpeakerRecipientToAudience } from "@meyouquize/shared";

export function speakerTargetLabel(speakerName: string): string {
  if (speakerName === SPEAKER_ALL_TARGET) return "кому: всем спикерам";
  return `кому: ${speakerName}`;
}

/** Подпись «кому» для игрока и проектора; для «не выбрано» — скрыть. */
export function speakerTargetLabelForAudience(speakerName: string): string | null {
  if (!shouldShowSpeakerRecipientToAudience(speakerName)) return null;
  return speakerTargetLabel(speakerName);
}
