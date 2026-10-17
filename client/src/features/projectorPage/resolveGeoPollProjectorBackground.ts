/**
 * Фон экрана геоопроса на проекторе.
 * - свой #RRGGBB → сплошной цвет без картинки бренда;
 * - `transparent` → обычный фон проектора (цвет + картинка).
 */
export function resolveGeoPollProjectorBackground(params: {
  isGeoPollFullBleed: boolean;
  geoPollScreenBackground: string;
  projectorBackground: string;
  brandProjectorBackgroundImageUrl?: string;
}): { backgroundColor: string; backgroundImageUrl: string | undefined } {
  const {
    isGeoPollFullBleed,
    geoPollScreenBackground,
    projectorBackground,
    brandProjectorBackgroundImageUrl,
  } = params;

  const solid =
    isGeoPollFullBleed && geoPollScreenBackground !== "transparent"
      ? geoPollScreenBackground
      : null;

  return {
    backgroundColor: solid ?? projectorBackground,
    backgroundImageUrl: solid ? undefined : brandProjectorBackgroundImageUrl,
  };
}
