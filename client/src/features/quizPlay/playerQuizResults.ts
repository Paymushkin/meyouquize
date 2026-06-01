import {
  isQuizResultsTileId,
  parseQuizResultsSubQuizIdFromTileId,
  quizResultsTileIdForSubQuiz,
} from "@meyouquize/shared";

export type PlayerSubQuizRef = { id: string; title: string };

export function resolveEffectiveSubQuizId(
  preferredSubQuizId: string,
  subQuizzes: PlayerSubQuizRef[] | undefined,
): string {
  const subs = subQuizzes ?? [];
  if (subs.length === 0) return "";
  const pref = preferredSubQuizId.trim();
  return pref || subs[0]!.id;
}

export function resolveQuizResultsTileTitle(
  caption: string,
  subQuizzes: PlayerSubQuizRef[] | undefined,
  effectiveSubQuizId: string,
): string {
  if (!effectiveSubQuizId) return caption;
  const hit = subQuizzes?.find((s) => s.id === effectiveSubQuizId);
  if (!hit) return caption;
  return hit.title.trim();
}

export function resolveQuizResultsTileScore(
  scoresBySubQuiz: Record<string, number> | undefined,
  effectiveSubQuizId: string,
): number | undefined {
  if (!effectiveSubQuizId) return undefined;
  const v = scoresBySubQuiz?.[effectiveSubQuizId];
  return typeof v === "number" ? v : undefined;
}

/** Какие сабквизы показывают плитку отчёта (новый массив + legacy single). */
export function resolveEnabledQuizReportSubQuizIds(input: {
  subQuizIds?: string[] | undefined;
  legacyVisible?: boolean;
  legacySubQuizId?: string;
  subQuizzes?: PlayerSubQuizRef[];
}): string[] {
  const validIds = new Set((input.subQuizzes ?? []).map((s) => s.id));
  const filterKnown = (ids: string[]) =>
    validIds.size === 0 ? ids : ids.filter((id) => validIds.has(id));

  if (Array.isArray(input.subQuizIds) && input.subQuizIds.length > 0) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of input.subQuizIds) {
      const id = raw.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return filterKnown(out).slice(0, 20);
  }
  if (input.legacyVisible) {
    const pref = input.legacySubQuizId?.trim() ?? "";
    if (pref) return filterKnown([pref]);
    const first = input.subQuizzes?.[0]?.id;
    return first ? filterKnown([first]) : [];
  }
  return [];
}

export type PlayerQuizResultsTileModel = {
  subQuizId: string;
  visible: boolean;
  caption: string;
  effectiveSubQuizId: string;
  title: string;
  score: number | undefined;
  tileId: string;
};

export function buildPlayerQuizResultsTileModel(input: {
  subQuizId: string;
  visible: boolean;
  caption: string;
  subQuizzes: PlayerSubQuizRef[] | undefined;
  scoresBySubQuiz: Record<string, number> | undefined;
}): PlayerQuizResultsTileModel {
  const effectiveSubQuizId = input.subQuizId.trim();
  return {
    subQuizId: effectiveSubQuizId,
    visible: input.visible,
    caption: input.caption,
    effectiveSubQuizId,
    title: resolveQuizResultsTileTitle(input.caption, input.subQuizzes, effectiveSubQuizId),
    score: resolveQuizResultsTileScore(input.scoresBySubQuiz, effectiveSubQuizId),
    tileId: quizResultsTileIdForSubQuiz(effectiveSubQuizId),
  };
}

export function buildPlayerQuizResultsTilesForPlayer(input: {
  enabledSubQuizIds: string[];
  caption: string;
  subQuizzes: PlayerSubQuizRef[] | undefined;
  scoresBySubQuiz: Record<string, number> | undefined;
}): PlayerQuizResultsTileModel[] {
  return input.enabledSubQuizIds.map((subQuizId) =>
    buildPlayerQuizResultsTileModel({
      subQuizId,
      visible: true,
      caption: input.caption,
      subQuizzes: input.subQuizzes,
      scoresBySubQuiz: input.scoresBySubQuiz,
    }),
  );
}

export function resolveQuizReportSubQuizIdForTileId(
  tileId: string,
  enabledSubQuizIds: string[],
  legacyEffectiveSubQuizId: string,
): string | null {
  const fromTile = parseQuizResultsSubQuizIdFromTileId(tileId);
  if (fromTile) {
    return enabledSubQuizIds.includes(fromTile) ? fromTile : null;
  }
  if (isQuizResultsTileId(tileId) && enabledSubQuizIds.length > 0) {
    return legacyEffectiveSubQuizId || enabledSubQuizIds[0] || null;
  }
  return null;
}
