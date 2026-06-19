export function optionImageUrl(value?: string | null): string {
  return value?.trim() ?? "";
}

export function optionHasImage(value?: string | null): boolean {
  return optionImageUrl(value).length > 0;
}

export function optionHasTextOrImage(text: string, imageUrl?: string | null): boolean {
  return Boolean(text.trim() || optionImageUrl(imageUrl));
}

export function questionHasOptionImages<T extends { imageUrl?: string | null }>(
  options: readonly T[],
): boolean {
  return options.some((option) => optionHasImage(option.imageUrl));
}

/** Есть картинка у вопроса или хотя бы у одного варианта (флаг useImages в админке). */
export function inferQuestionUseImages(q: {
  imageUrl?: string | null;
  options?: readonly { imageUrl?: string | null }[];
}): boolean {
  return optionHasImage(q.imageUrl) || questionHasOptionImages(q.options ?? []);
}
