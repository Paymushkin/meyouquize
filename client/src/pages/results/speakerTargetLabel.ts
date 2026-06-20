export function speakerTargetLabel(speakerName: string): string {
  return speakerName === "Все спикеры" ? "кому: всем спикерам" : `кому: ${speakerName}`;
}
