export function buildModeratorHeading(eventTitle: string): string {
  const trimmed = eventTitle.trim();
  return trimmed ? `Вопросы спикерам | ${trimmed}` : "Вопросы спикерам";
}

export function buildModeratorDocumentTitle(eventTitle: string): string {
  const trimmed = eventTitle.trim();
  return trimmed ? `Вопросы спикерам | ${trimmed}` : "Вопросы спикерам · МИЮ";
}
