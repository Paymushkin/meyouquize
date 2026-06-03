const QUIZ_RESULTS_TILE_ID = "quiz_results_tile";

function isQuizResultsTileId(tileId: string): boolean {
  return tileId === QUIZ_RESULTS_TILE_ID || tileId.startsWith(`${QUIZ_RESULTS_TILE_ID}:`);
}

function parseQuizResultsSubQuizIdFromTileId(tileId: string): string | null {
  if (tileId === QUIZ_RESULTS_TILE_ID) return null;
  const prefix = `${QUIZ_RESULTS_TILE_ID}:`;
  if (!tileId.startsWith(prefix)) return null;
  const id = tileId.slice(prefix.length).trim();
  return id.length > 0 ? id.slice(0, 80) : null;
}

export type PlayerUiRefsSlice = {
  playerQuizResultsSubQuizIds: string[];
  playerQuizResultsSubQuizId: string;
  playerQuizResultsTileVisible: boolean;
  playerTilesOrder: string[];
  playerVisibleResultQuestionIds: string[];
  leaderboardSubQuizId: string;
  reportVoteQuestionIds: string[];
  reportQuizQuestionIds: string[];
  reportQuizSubQuizIds: string[];
};

function subQuizOk(id: string, validSubQuizIds: ReadonlySet<string>): boolean {
  const trimmed = id.trim();
  return trimmed.length > 0 && validSubQuizIds.has(trimmed);
}

function questionOk(id: string, validQuestionIds: ReadonlySet<string>): boolean {
  const trimmed = id.trim();
  return trimmed.length > 0 && validQuestionIds.has(trimmed);
}

/** Убирает из public view ссылки на удалённые сабквизы и вопросы (плитки игрока, отчёты). */
export function prunePlayerUiRefsForRoom(
  refs: PlayerUiRefsSlice,
  validSubQuizIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string>,
): PlayerUiRefsSlice {
  const playerQuizResultsSubQuizIds = refs.playerQuizResultsSubQuizIds.filter((id) =>
    subQuizOk(id, validSubQuizIds),
  );

  const playerTilesOrder = refs.playerTilesOrder.filter((tileId) => {
    const sqFromTile = parseQuizResultsSubQuizIdFromTileId(tileId);
    if (sqFromTile !== null) return subQuizOk(sqFromTile, validSubQuizIds);
    if (tileId === QUIZ_RESULTS_TILE_ID) return playerQuizResultsSubQuizIds.length > 0;
    if (isQuizResultsTileId(tileId)) return false;
    return true;
  });

  const playerVisibleResultQuestionIds = refs.playerVisibleResultQuestionIds.filter((id) =>
    questionOk(id, validQuestionIds),
  );

  const firstSubQuizId = playerQuizResultsSubQuizIds[0] ?? "";
  const fallbackLeaderboardId = validSubQuizIds.size > 0 ? [...validSubQuizIds][0]! : "";

  let leaderboardSubQuizId = refs.leaderboardSubQuizId.trim();
  if (!subQuizOk(leaderboardSubQuizId, validSubQuizIds)) {
    leaderboardSubQuizId = subQuizOk(firstSubQuizId, validSubQuizIds)
      ? firstSubQuizId
      : fallbackLeaderboardId;
  }

  const playerQuizResultsSubQuizId = subQuizOk(refs.playerQuizResultsSubQuizId, validSubQuizIds)
    ? refs.playerQuizResultsSubQuizId.trim()
    : firstSubQuizId;

  return {
    playerQuizResultsSubQuizIds,
    playerQuizResultsSubQuizId,
    playerQuizResultsTileVisible: playerQuizResultsSubQuizIds.length > 0,
    playerTilesOrder,
    playerVisibleResultQuestionIds,
    leaderboardSubQuizId,
    reportVoteQuestionIds: refs.reportVoteQuestionIds.filter((id) =>
      questionOk(id, validQuestionIds),
    ),
    reportQuizQuestionIds: refs.reportQuizQuestionIds.filter((id) =>
      questionOk(id, validQuestionIds),
    ),
    reportQuizSubQuizIds: refs.reportQuizSubQuizIds.filter((id) => subQuizOk(id, validSubQuizIds)),
  };
}

export type PublicViewWithPlayerUi = PlayerUiRefsSlice & Record<string, unknown>;

export function prunePublicViewForRoomContent<T extends PlayerUiRefsSlice>(
  view: T,
  validSubQuizIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string>,
): T {
  return {
    ...view,
    ...prunePlayerUiRefsForRoom(view, validSubQuizIds, validQuestionIds),
  };
}

export function playerUiRefsChanged(before: PlayerUiRefsSlice, after: PlayerUiRefsSlice): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}
