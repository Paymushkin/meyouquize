export type QuizPlayConnectionStatus = "online" | "reconnecting" | "offline";

export type QuizPlayConnectionIndicator = {
  /** Состояние для цвета точки. */
  tone: "online" | "reconnecting" | "offline";
  /** Текст для aria/tooltip. */
  label: string;
};

export function buildQuizPlayConnectionChip(
  status: QuizPlayConnectionStatus,
  quizSessionReady: boolean,
): QuizPlayConnectionIndicator {
  if (!quizSessionReady && status !== "offline") {
    return { tone: "reconnecting", label: "Переподключаемся…" };
  }
  if (status === "online") {
    return { tone: "online", label: "Онлайн" };
  }
  if (status === "reconnecting") {
    return { tone: "reconnecting", label: "Переподключение" };
  }
  return { tone: "offline", label: "Нет соединения" };
}

export function quizPlayConnectionDotColor(tone: QuizPlayConnectionIndicator["tone"]): string {
  if (tone === "online") return "#2e7d32";
  if (tone === "reconnecting") return "#f9a825";
  return "#c62828";
}
