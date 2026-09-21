/** После снятия вопроса спикера с экрана: если больше нечего показывать — вернуть проектор на title/QR. */
export function shouldFallbackProjectorToTitleAfterSpeakerOff(
  remainingOnScreenCount: number,
): boolean {
  return remainingOnScreenCount <= 0;
}
