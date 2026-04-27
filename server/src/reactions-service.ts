export type ReactionType = string;

const DEFAULT_REACTIONS = ["👍", "👏", "🔥", "🤔"] as const;

export type ReactionSessionHistoryItem = {
  id: string;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
};

export type ReactionSessionPublic = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
  history: ReactionSessionHistoryItem[];
};

type ReactionSessionInternal = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: Date;
  endsAt: Date;
  reactions: string[];
  counts: Record<string, number>;
  participantIds: Set<string>;
  reactionParticipantIds: Record<string, Set<string>>;
};

const sessionsByQuiz = new Map<string, ReactionSessionInternal>();
const historyByQuiz = new Map<string, ReactionSessionHistoryItem[]>();

function normalizeReactionList(reactions?: string[]): string[] {
  const source =
    Array.isArray(reactions) && reactions.length > 0 ? reactions : [...DEFAULT_REACTIONS];
  const deduped: string[] = [];
  for (const item of source) {
    const trimmed = (item ?? "").trim();
    if (!trimmed) continue;
    if (!deduped.includes(trimmed)) deduped.push(trimmed);
  }
  return deduped.length > 0 ? deduped : [...DEFAULT_REACTIONS];
}

function makeEmptyCounts(reactions: string[]): Record<string, number> {
  return reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction] = 0;
    return acc;
  }, {});
}

function makeEmptyReactionParticipantIds(reactions: string[]): Record<string, Set<string>> {
  return reactions.reduce<Record<string, Set<string>>>((acc, reaction) => {
    acc[reaction] = new Set<string>();
    return acc;
  }, {});
}

function toUniqueReactorsByReactionMap(session: ReactionSessionInternal): Record<string, number> {
  return session.reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction] = session.reactionParticipantIds[reaction]?.size ?? 0;
    return acc;
  }, {});
}

function computeTotals(
  session: ReactionSessionInternal,
): Pick<ReactionSessionPublic, "totalReactions" | "uniqueReactors"> {
  const totalReactions = Object.values(session.counts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const uniqueReactors = session.participantIds.size;
  return { totalReactions, uniqueReactors };
}

function buildHistoryForQuiz(quizId: string): ReactionSessionHistoryItem[] {
  return historyByQuiz.get(quizId) ?? [];
}

function pushHistorySnapshot(session: ReactionSessionInternal) {
  const totals = computeTotals(session);
  const current = historyByQuiz.get(session.quizId) ?? [];
  const entry: ReactionSessionHistoryItem = {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
  };
  const filtered = current.filter((item) => item.id !== session.id);
  historyByQuiz.set(session.quizId, [entry, ...filtered].slice(0, 30));
}

export function getReactionSessionPublic(quizId: string): ReactionSessionPublic | null {
  const session = sessionsByQuiz.get(quizId);
  if (!session) return null;
  const totals = computeTotals(session);
  return {
    id: session.id,
    quizId: session.quizId,
    isActive: session.isActive,
    startedAt: session.startedAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    reactions: [...session.reactions],
    counts: { ...session.counts },
    uniqueReactorsByReaction: toUniqueReactorsByReactionMap(session),
    totalReactions: totals.totalReactions,
    uniqueReactors: totals.uniqueReactors,
    history: buildHistoryForQuiz(quizId),
  };
}

export function startReactionSession(
  quizId: string,
  durationSec: number,
  reactions?: string[],
): ReactionSessionPublic {
  const prev = sessionsByQuiz.get(quizId);
  if (prev) {
    prev.isActive = false;
    pushHistorySnapshot(prev);
  }
  const normalizedReactions = normalizeReactionList(reactions);
  const now = new Date();
  const endsAt = new Date(now.getTime() + durationSec * 1000);
  const session: ReactionSessionInternal = {
    id: globalThis.crypto?.randomUUID?.() ?? `reaction_${Date.now()}`,
    quizId,
    isActive: true,
    startedAt: now,
    endsAt,
    reactions: normalizedReactions,
    counts: makeEmptyCounts(normalizedReactions),
    participantIds: new Set(),
    reactionParticipantIds: makeEmptyReactionParticipantIds(normalizedReactions),
  };
  sessionsByQuiz.set(quizId, session);
  return getReactionSessionPublic(quizId)!;
}

export function stopReactionSession(quizId: string): ReactionSessionPublic | null {
  const session = sessionsByQuiz.get(quizId);
  if (!session) return null;
  session.isActive = false;
  pushHistorySnapshot(session);
  return getReactionSessionPublic(quizId);
}

export function addReaction(
  quizId: string,
  participantId: string,
  reactionType: ReactionType,
): ReactionSessionPublic | null {
  const session = sessionsByQuiz.get(quizId);
  if (!session || !session.isActive) return null;
  if (!session.reactions.includes(reactionType)) return null;
  session.counts[reactionType] = (session.counts[reactionType] ?? 0) + 1;
  session.participantIds.add(participantId);
  session.reactionParticipantIds[reactionType]?.add(participantId);
  pushHistorySnapshot(session);
  return getReactionSessionPublic(quizId);
}
