/** Общий вид модалок игрока (вопросы спикерам, отчёт по квизу). */
export const PLAYER_DIALOG_PAPER_SX = {
  bgcolor: "rgba(0, 0, 0, 0.9)",
  color: "#fff",
  backdropFilter: "blur(4px)",
} as const;

export const PLAYER_DIALOG_TITLE_SX = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  pr: 0.5,
  pb: 1,
  color: "#fff",
} as const;

export const PLAYER_DIALOG_CONTENT_SX = {
  pt: 0.5,
  pb: 1.5,
  color: "#fff",
} as const;

export const PLAYER_DIALOG_SECONDARY_TEXT = {
  color: "rgba(255, 255, 255, 0.65)",
} as const;
