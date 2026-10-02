export type SyncKnownSpeakerQuestionIdsResult = {
  knownIds: Set<string>;
  hasNew: boolean;
  isInitialSnapshot: boolean;
};

/** Отслеживает id вопросов; hasNew=true, если появился id, которого не было в прошлом снимке. */
export function syncKnownSpeakerQuestionIds(
  knownIds: Set<string> | null,
  nextIds: readonly string[],
): SyncKnownSpeakerQuestionIdsResult {
  if (knownIds == null) {
    return {
      knownIds: new Set(nextIds),
      hasNew: false,
      isInitialSnapshot: true,
    };
  }
  const known = new Set(knownIds);
  let hasNew = false;
  for (const id of nextIds) {
    if (!known.has(id)) {
      known.add(id);
      hasNew = true;
    }
  }
  const nextSet = new Set(nextIds);
  for (const id of [...known]) {
    if (!nextSet.has(id)) known.delete(id);
  }
  return { knownIds: known, hasNew, isInitialSnapshot: false };
}

export function shouldShowSpeakersNavBadge(hasNew: boolean, activeSection: string): boolean {
  return hasNew && activeSection !== "speakers";
}
