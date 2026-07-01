import type { PublicViewMode } from "../../publicViewContract";

function publicScreenModeLabel(mode: PublicViewMode): string {
  if (mode === "leaderboard") return "таблица лидеров";
  if (mode === "speaker_questions") return "вопросы спикерам";
  if (mode === "reactions") return "реакции";
  if (mode === "randomizer") return "рандомайзер";
  if (mode === "report") return "отчет";
  if (mode === "question") return "вопрос";
  return "название";
}

export function getCurrentPublicScreenText(params: {
  mode: PublicViewMode;
  projectorJoinQrVisible: boolean;
  eventTitle?: string;
}): string {
  const { mode, projectorJoinQrVisible, eventTitle } = params;
  if (mode !== "title") return publicScreenModeLabel(mode);
  if (projectorJoinQrVisible) return "qr";
  return eventTitle?.trim() ? "название" : "фон";
}
