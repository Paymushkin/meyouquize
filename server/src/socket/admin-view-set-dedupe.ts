export const VIEW_SET_DEDUPE_MS = 400;

export type AdminViewSetDedupeState = { key: string; at: number };

const PROJECTOR_DEDUPE_FIELDS = [
  "quizId",
  "mode",
  "questionId",
  "questionRevealStage",
  "showFirstCorrectAnswerer",
] as const;

/**
 * Dedupe key: projector identity + fingerprint остальных полей.
 * Иначе branding-only toggle (QR visible и т.п.) отбрасывается при бурсте.
 */
export function adminViewSetDedupeKey(payload: Record<string, unknown>): string {
  const projector: Record<string, unknown> = {};
  for (const key of PROJECTOR_DEDUPE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      projector[key] = payload[key];
    }
  }
  const projectorSet = new Set<string>(PROJECTOR_DEDUPE_FIELDS);
  const extras: Record<string, unknown> = {};
  for (const key of Object.keys(payload).sort()) {
    if (projectorSet.has(key)) continue;
    extras[key] = payload[key];
  }
  return JSON.stringify({
    ...projector,
    ...(Object.keys(extras).length > 0 ? { extras } : {}),
  });
}

export function shouldSkipAdminViewSetDedupe(
  prev: AdminViewSetDedupeState | undefined,
  key: string,
  now: number,
): boolean {
  return !!(prev && prev.key === key && now - prev.at < VIEW_SET_DEDUPE_MS);
}
