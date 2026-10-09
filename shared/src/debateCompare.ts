import { optionTextTrimmed } from "./voteOptionContent.js";

export type DebateOptionStat = {
  optionId: string;
  /** Может отсутствовать у image-only вариантов с провода. */
  text?: string;
  count: number;
};

/** Заголовок накопительного итога серии по умолчанию (админка + проектор). */
export const DEFAULT_DEBATE_SERIES_RESULT_TITLE = "Накопительный итог";

export function resolveDebateSeriesResultTitle(raw: string | null | undefined): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed || DEFAULT_DEBATE_SERIES_RESULT_TITLE;
}

export type DebateCompareRow = {
  optionId: string;
  text: string;
  baselinePercent: number;
  finalPercent: number;
  baselineCount: number;
  finalCount: number;
  deltaPp: number;
};

export function debateOptionPercents(
  stats: DebateOptionStat[],
): Array<DebateOptionStat & { percent: number }> {
  const total = stats.reduce((sum, row) => sum + Math.max(0, row.count), 0);
  return stats.map((row) => ({
    ...row,
    percent: total > 0 ? (Math.max(0, row.count) / total) * 100 : 0,
  }));
}

/** Сопоставляет варианты baseline/final по порядку (индекс). */
export function buildDebateCompareRows(
  baselineStats: DebateOptionStat[],
  finalStats: DebateOptionStat[],
): DebateCompareRow[] {
  const baseline = debateOptionPercents(baselineStats);
  const final = debateOptionPercents(finalStats);
  const len = Math.max(baseline.length, final.length);
  const rows: DebateCompareRow[] = [];
  for (let i = 0; i < len; i += 1) {
    const b = baseline[i];
    const f = final[i];
    const baselinePercent = b?.percent ?? 0;
    const finalPercent = f?.percent ?? 0;
    rows.push({
      optionId: f?.optionId ?? b?.optionId ?? `row-${i}`,
      text: optionTextTrimmed(f?.text) || optionTextTrimmed(b?.text) || `Вариант ${i + 1}`,
      baselinePercent,
      finalPercent,
      baselineCount: b?.count ?? 0,
      finalCount: f?.count ?? 0,
      deltaPp: finalPercent - baselinePercent,
    });
  }
  return rows;
}

const UNDECIDED_RE = /не\s*определ/i;

export function isDebateUndecidedOption(text: string): boolean {
  return UNDECIDED_RE.test(text.trim());
}

/** Подпись «перевеса» для side A/B (первые два варианта без «не определился»). */
export function formatDebateSwingLabel(rows: DebateCompareRow[]): string | null {
  const ab = rows.filter((row) => !isDebateUndecidedOption(row.text));
  if (ab.length < 2) return null;
  const [sideA, sideB] = ab;
  const aDelta = sideA.deltaPp;
  const bDelta = sideB.deltaPp;
  const maxAbs = Math.max(Math.abs(aDelta), Math.abs(bDelta));
  if (maxAbs < 0.05) {
    return "Мнения практически не изменились";
  }
  if (bDelta >= aDelta) {
    const pp = Math.round(Math.abs(bDelta));
    return pp > 0 ? `+${pp} п.п. в пользу «${sideB.text}»` : `Перевес в пользу «${sideB.text}»`;
  }
  const pp = Math.round(Math.abs(aDelta));
  return pp > 0 ? `+${pp} п.п. в пользу «${sideA.text}»` : `Перевес в пользу «${sideA.text}»`;
}

export function singlePollDebateSideBySideEligible(input: {
  type?: string;
  optionCount: number;
  projectorDebateLayout?: boolean;
}): boolean {
  if (input.projectorDebateLayout !== true) return false;
  if (input.type !== "single" && input.type !== "multi") return false;
  return input.optionCount >= 2;
}

export type DebateSeriesOptionStat = DebateOptionStat & {
  imageUrl?: string;
  color?: string;
  isCorrect?: boolean;
};

/**
 * Суммирует optionStats раундов дебатов по индексу стороны (слоту).
 * Текст/цвет берётся из последнего раунда, где слот есть.
 */
export function sumDebateSeriesOptionStats(
  rounds: DebateSeriesOptionStat[][],
): DebateSeriesOptionStat[] {
  if (rounds.length === 0) return [];
  const slotCount = Math.max(0, ...rounds.map((r) => r.length));
  const out: DebateSeriesOptionStat[] = [];
  for (let i = 0; i < slotCount; i += 1) {
    let count = 0;
    let text = `Вариант ${i + 1}`;
    let optionId = `series-slot-${i}`;
    let imageUrl: string | undefined;
    let color: string | undefined;
    let isCorrect = false;
    for (const round of rounds) {
      const row = round[i];
      if (!row) continue;
      count += Math.max(0, row.count);
      if (row.text?.trim()) text = row.text.trim();
      if (row.optionId) optionId = row.optionId;
      if (row.imageUrl) imageUrl = row.imageUrl;
      if (row.color) color = row.color;
      if (row.isCorrect) isCorrect = true;
    }
    out.push({ optionId, text, count, imageUrl, color, isCorrect });
  }
  return out;
}

/** Группирует вопросы серии по debateSeriesId. */
export function groupDebateSeriesQuestionIds(
  questions: Array<{
    questionId: string;
    debateSeriesId?: string | null;
    debateRoundIndex?: number | null;
  }>,
): Map<string, string[]> {
  const map = new Map<string, Array<{ questionId: string; round: number }>>();
  for (const q of questions) {
    const seriesId = q.debateSeriesId?.trim();
    if (!seriesId) continue;
    const list = map.get(seriesId) ?? [];
    list.push({
      questionId: q.questionId,
      round: q.debateRoundIndex ?? 0,
    });
    map.set(seriesId, list);
  }
  const out = new Map<string, string[]>();
  for (const [seriesId, list] of map) {
    out.set(
      seriesId,
      [...list]
        .sort((a, b) => a.round - b.round || a.questionId.localeCompare(b.questionId))
        .map((x) => x.questionId),
    );
  }
  return out;
}
