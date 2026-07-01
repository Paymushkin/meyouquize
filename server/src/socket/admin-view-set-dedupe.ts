export const VIEW_SET_DEDUPE_MS = 400;

export type AdminViewSetDedupeState = { key: string; at: number };

export function adminViewSetDedupeKey(payload: {
  quizId: string;
  mode?: string;
  questionId?: string;
  questionRevealStage?: string;
  showFirstCorrectAnswerer?: boolean;
}): string {
  return JSON.stringify({
    quizId: payload.quizId,
    mode: payload.mode,
    questionId: payload.questionId,
    questionRevealStage: payload.questionRevealStage,
    showFirstCorrectAnswerer: payload.showFirstCorrectAnswerer,
  });
}

export function shouldSkipAdminViewSetDedupe(
  prev: AdminViewSetDedupeState | undefined,
  key: string,
  now: number,
): boolean {
  return !!(prev && prev.key === key && now - prev.at < VIEW_SET_DEDUPE_MS);
}
