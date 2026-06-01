const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/** Формат из админки: `linear-gradient(135deg, #rrggbb 0%, #rrggbb 100%)` */
export const VOTE_QUESTION_TEXT_GRADIENT_RE =
  /^linear-gradient\(\s*([0-9]{1,3})deg\s*,\s*(#[0-9a-fA-F]{6})\s+0%\s*,\s*(#[0-9a-fA-F]{6})\s+100%\s*\)$/i;

export function isVoteQuestionTextGradient(value: string): boolean {
  return value.trim().toLowerCase().startsWith("linear-gradient(");
}

export function isValidVoteQuestionTextColor(value: string): boolean {
  const v = value.trim();
  if (HEX6_RE.test(v)) return true;
  return VOTE_QUESTION_TEXT_GRADIENT_RE.test(v);
}

function sanitizeHex6Local(value: string | undefined, fallback: string): string {
  if (typeof value === "string" && HEX6_RE.test(value.trim())) return value.trim();
  return fallback;
}

export function buildVoteQuestionTextGradient(from: string, to: string, deg: number): string {
  const d = Math.max(0, Math.min(360, Math.round(deg)));
  const f = sanitizeHex6Local(from, "#ffffff");
  const t = sanitizeHex6Local(to, "#000000");
  return `linear-gradient(${d}deg, ${f} 0%, ${t} 100%)`;
}

export function parseVoteQuestionTextGradient(
  value: string,
): { from: string; to: string; deg: number } | null {
  const m = value.trim().match(VOTE_QUESTION_TEXT_GRADIENT_RE);
  if (!m) return null;
  return { deg: Number(m[1]), from: m[2]!, to: m[3]! };
}

export function sanitizeVoteQuestionTextColor(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim().slice(0, 200);
  if (HEX6_RE.test(v)) return v;
  if (VOTE_QUESTION_TEXT_GRADIENT_RE.test(v)) return v;
  return fallback;
}

/** Стили для Typography на проекторе: сплошной цвет или gradient text. */
export function voteQuestionTextTypographyStyle(value: string): Record<string, string | number> {
  if (isVoteQuestionTextGradient(value) && VOTE_QUESTION_TEXT_GRADIENT_RE.test(value.trim())) {
    return {
      background: value.trim(),
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    };
  }
  return { color: sanitizeHex6Local(value, "#1f1f1f") };
}

/** Общий формат градиента для заливок проектора (текст вопроса, столбики). */
export const VOTE_FILL_GRADIENT_RE = VOTE_QUESTION_TEXT_GRADIENT_RE;
export const isVoteFillGradient = isVoteQuestionTextGradient;
export const isValidVoteFillColor = isValidVoteQuestionTextColor;
export const buildVoteFillGradient = buildVoteQuestionTextGradient;
export const parseVoteFillGradient = parseVoteQuestionTextGradient;
export const sanitizeVoteFillColor = sanitizeVoteQuestionTextColor;

/** Заливка `.MuiLinearProgress-bar` на проекторе. */
export function voteProgressBarFillStyle(value: string): Record<string, string> {
  const v = value.trim();
  if (isVoteFillGradient(v) && VOTE_FILL_GRADIENT_RE.test(v)) {
    return { background: v };
  }
  return { backgroundColor: sanitizeHex6Local(value, "#1976d2") };
}

/** Обводка столбика: для градиента — начальный цвет. */
export function voteFillOutlineColor(value: string, fallback = "#1976d2"): string {
  const v = value.trim();
  if (HEX6_RE.test(v)) return v;
  return parseVoteFillGradient(v)?.from ?? fallback;
}
