export {
  inferQuestionUseImages,
  optionHasImage,
  optionHasTextOrImage,
  optionImageUrl,
  questionHasOptionImages,
} from "@meyouquize/shared";

export const PLAYER_VOTE_RESULT_OPTION_IMAGE_SIZE = 44;
export const PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE = 40;
export const PLAYER_RESULT_PREVIEW_OPTION_IMAGE_SIZE = 28;
export const PROJECTOR_OPTION_LABEL_IMAGE_SIZE = 48;
export const PROJECTOR_OPTION_LABEL_IMAGE_SIZE_COMPACT = 72;

export const PLAYER_OPTION_IMAGE_GRID_COLUMNS = "repeat(2, minmax(0, 1fr))";

export function optionAltText(text: string, fallback = "Вариант"): string {
  return text.trim() || fallback;
}

export function playerOptionImageGridTemplate(hasOptionImages: boolean): string {
  return hasOptionImages ? PLAYER_OPTION_IMAGE_GRID_COLUMNS : "1fr";
}

export function shouldSpanFullWidthInOptionGrid(
  hasOptionImages: boolean,
  optionCount: number,
  optionIndex: number,
): boolean {
  return hasOptionImages && optionCount % 2 === 1 && optionIndex === optionCount - 1;
}

export function projectorOptionLabelImageSize(hasOptionImages: boolean): number {
  return hasOptionImages
    ? PROJECTOR_OPTION_LABEL_IMAGE_SIZE_COMPACT
    : PROJECTOR_OPTION_LABEL_IMAGE_SIZE;
}

export function projectorOptionRevealMinHeight(hasOptionImages: boolean): {
  xs: number;
  md: number;
} {
  return hasOptionImages ? { xs: 88, md: 96 } : { xs: 92, md: 112 };
}
