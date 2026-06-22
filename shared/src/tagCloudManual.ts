export type CloudWordCount = { text: string; count: number };

export type TagCloudQuestionManualState = {
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
};

export type TagCloudManualByQuestionId = Record<string, TagCloudQuestionManualState>;

export const EMPTY_TAG_CLOUD_QUESTION_MANUAL: TagCloudQuestionManualState = {
  hiddenTagTexts: [],
  injectedTagWords: [],
  tagCountOverrides: [],
};

export function resolveTagCloudManualForQuestion(
  manual: TagCloudManualByQuestionId | undefined,
  questionId?: string,
): TagCloudQuestionManualState {
  const qid = questionId?.trim() ?? "";
  if (!qid) return { ...EMPTY_TAG_CLOUD_QUESTION_MANUAL };
  const entry = manual?.[qid];
  if (!entry) return { ...EMPTY_TAG_CLOUD_QUESTION_MANUAL };
  return {
    hiddenTagTexts: [...entry.hiddenTagTexts],
    injectedTagWords: [...entry.injectedTagWords],
    tagCountOverrides: [...entry.tagCountOverrides],
  };
}

type ProjectorTagCloudView = {
  mode: string;
  questionId?: string;
  tagCloudManualByQuestionId: TagCloudManualByQuestionId;
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
};

/** Проектор читает ручные теги из tagCloudManualByQuestionId; top-level поля — только runtime-снимок. */
export function withProjectorTagCloudFields<T extends ProjectorTagCloudView>(view: T): T {
  if (view.mode !== "question" || !view.questionId?.trim()) {
    return {
      ...view,
      hiddenTagTexts: [],
      injectedTagWords: [],
      tagCountOverrides: [],
    };
  }
  const resolved = resolveTagCloudManualForQuestion(
    view.tagCloudManualByQuestionId,
    view.questionId,
  );
  return {
    ...view,
    hiddenTagTexts: resolved.hiddenTagTexts,
    injectedTagWords: resolved.injectedTagWords,
    tagCountOverrides: resolved.tagCountOverrides,
  };
}

export function hasTagCloudManualContent(state: TagCloudQuestionManualState): boolean {
  return (
    state.hiddenTagTexts.length > 0 ||
    state.injectedTagWords.length > 0 ||
    state.tagCountOverrides.length > 0
  );
}

/** Перенос legacy top-level полей в карту при загрузке старых publicView. */
export function migrateLegacyTagCloudManualIntoMap(
  manual: TagCloudManualByQuestionId,
  raw: {
    questionId?: string;
    hiddenTagTexts?: string[];
    injectedTagWords?: CloudWordCount[];
    tagCountOverrides?: CloudWordCount[];
  },
): TagCloudManualByQuestionId {
  const qid = typeof raw.questionId === "string" ? raw.questionId.trim() : "";
  if (!qid || manual[qid]) return manual;
  const legacy: TagCloudQuestionManualState = {
    hiddenTagTexts: Array.isArray(raw.hiddenTagTexts)
      ? raw.hiddenTagTexts.filter((item) => typeof item === "string" && item.trim().length > 0)
      : [],
    injectedTagWords: Array.isArray(raw.injectedTagWords) ? raw.injectedTagWords : [],
    tagCountOverrides: Array.isArray(raw.tagCountOverrides) ? raw.tagCountOverrides : [],
  };
  if (!hasTagCloudManualContent(legacy)) return manual;
  return { ...manual, [qid]: legacy };
}
