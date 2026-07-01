export function buildQuizPlayConnectionChip(
  status: "online" | "reconnecting" | "offline",
  quizSessionReady: boolean,
) {
  if (!quizSessionReady && status !== "offline") {
    return {
      label: "Переподключаемся…",
      color: "warning" as const,
      variant: "outlined" as const,
    };
  }
  if (status === "online") {
    return { label: "Онлайн", variant: "filled" as const, accentFill: true as const };
  }
  if (status === "reconnecting") {
    return { label: "Переподключение", color: "warning" as const, variant: "outlined" as const };
  }
  return { label: "Нет соединения", color: "error" as const, variant: "outlined" as const };
}
