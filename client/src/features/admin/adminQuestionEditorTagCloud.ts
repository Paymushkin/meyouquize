import type { Dispatch, SetStateAction } from "react";
import type { QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";
import {
  buildTagResultsDisplayOrder,
  clearCountOverrideRow,
  mergeInjectedTagWords,
  parseInjectedTagLines,
  setOptionVoteCountOverrideRow,
  setTagCountOverrideRow,
  toggleHiddenTagText,
} from "../tagCloudAdmin";

export type AdminQuestionEditorTagCloudCtx = {
  questionForms: QuestionForm[];
  questionResults: QuestionResult[];
  setQuestionForms: Dispatch<SetStateAction<QuestionForm[]>>;
  setMessage: (message: string) => void;
  persistCloudManualSnapshot: (forms: QuestionForm[]) => void;
  tagInputDialogQuestionIndex: number | null;
  setTagInputDialogQuestionIndex: Dispatch<SetStateAction<number | null>>;
  setTagResultsDialogQuestionIndex: Dispatch<SetStateAction<number | null>>;
  setTagResultsOrder: Dispatch<SetStateAction<string[]>>;
};

/** Ручные правки облака тегов / override голосов и диалоги ввода/результатов. */
export function createAdminQuestionEditorTagCloudMutations(ctx: AdminQuestionEditorTagCloudCtx) {
  function toggleTagVisibility(questionIndex: number, tagText: string) {
    const question = ctx.questionForms[questionIndex];
    const nextHidden = toggleHiddenTagText(question.hiddenTagTexts ?? [], tagText);
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, hiddenTagTexts: nextHidden } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function applyInjectedTagList(questionIndex: number) {
    const question = ctx.questionForms[questionIndex];
    const parsed = parseInjectedTagLines(question.injectedTagsInput ?? "");
    if (parsed.length === 0) {
      ctx.setMessage("Список пустой или формат неверный. Используйте строки вида: слово 10");
      return;
    }
    const nextWords = mergeInjectedTagWords(question.injectedTagWords ?? [], parsed);
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, injectedTagWords: nextWords, injectedTagsInput: "" } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
    ctx.setMessage("Список ответов добавлен");
  }

  function updateTagCountOverride(questionIndex: number, tagText: string, nextCount: number) {
    const question = ctx.questionForms[questionIndex];
    const nextOverrides = setTagCountOverrideRow(
      question.tagCountOverrides ?? [],
      tagText,
      nextCount,
    );
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearTagCountOverride(questionIndex: number, tagText: string) {
    const question = ctx.questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.tagCountOverrides ?? [], tagText);
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, tagCountOverrides: nextOverrides } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function updateOptionVoteCountOverride(
    questionIndex: number,
    optionId: string,
    liveCount: number,
    nextDisplayCount: number,
  ) {
    const question = ctx.questionForms[questionIndex];
    const nextOverrides = setOptionVoteCountOverrideRow(
      question.optionVoteCountOverrides ?? [],
      optionId,
      liveCount,
      nextDisplayCount,
    );
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function clearOptionVoteCountOverride(questionIndex: number, optionId: string) {
    const question = ctx.questionForms[questionIndex];
    const nextOverrides = clearCountOverrideRow(question.optionVoteCountOverrides ?? [], optionId);
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: nextOverrides } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function resetOptionVoteCountOverrides(questionIndex: number) {
    ctx.setQuestionForms((prev) => {
      const next = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, optionVoteCountOverrides: [] } : q,
      );
      ctx.persistCloudManualSnapshot(next);
      return next;
    });
  }

  function openTagInputDialog(questionIndex: number) {
    ctx.setTagInputDialogQuestionIndex(questionIndex);
  }

  function closeTagInputDialog() {
    ctx.setTagInputDialogQuestionIndex(null);
  }

  function applyInjectedTagListFromDialog() {
    if (ctx.tagInputDialogQuestionIndex === null) return;
    applyInjectedTagList(ctx.tagInputDialogQuestionIndex);
    closeTagInputDialog();
  }

  function openTagResultsDialog(questionIndex: number) {
    const question = ctx.questionForms[questionIndex];
    const result = question?.id
      ? ctx.questionResults.find((item) => item.questionId === question.id)
      : undefined;
    const tags = result?.tagCloud ?? [];
    const injected = question?.injectedTagWords ?? [];
    const overrides = question?.tagCountOverrides ?? [];
    ctx.setTagResultsOrder(buildTagResultsDisplayOrder({ liveTags: tags, injected, overrides }));
    ctx.setTagResultsDialogQuestionIndex(questionIndex);
  }

  function closeTagResultsDialog() {
    ctx.setTagResultsDialogQuestionIndex(null);
    ctx.setTagResultsOrder([]);
  }

  return {
    toggleTagVisibility,
    applyInjectedTagList,
    updateTagCountOverride,
    clearTagCountOverride,
    updateOptionVoteCountOverride,
    clearOptionVoteCountOverride,
    resetOptionVoteCountOverrides,
    openTagInputDialog,
    closeTagInputDialog,
    applyInjectedTagListFromDialog,
    openTagResultsDialog,
    closeTagResultsDialog,
  };
}
