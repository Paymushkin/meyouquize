import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  buildDebateSeriesNextRoundPatch,
  isDebatePollPreset,
  withDebateOptionColors,
} from "@meyouquize/shared";
import {
  cloneQuestionForm,
  createEmptyQuestion,
  validateQuestionsForm,
  type QuestionForm,
  type SubQuizSheet,
} from "../../admin/adminEventForm";
import { cloneQuestionForms } from "./adminQuestionFormPatch";

export type AdminQuestionEditorDebateSeriesCtx = {
  questionForms: QuestionForm[];
  subQuizSheets: SubQuizSheet[];
  setQuestionForms: Dispatch<SetStateAction<QuestionForm[]>>;
  setSelectedQuestionIndex: Dispatch<SetStateAction<number>>;
  setQuestionId: Dispatch<SetStateAction<string>>;
  setMessage: (message: string) => void;
  persistQuestions: (
    forms: QuestionForm[],
    sheets: SubQuizSheet[],
    opts?: { suppressToast?: boolean },
  ) => Promise<false | { questions: QuestionForm[] }>;
  questionDialogSnapshotRef: RefObject<QuestionForm[] | null>;
  questionDialogTargetSubQuizIdRef: RefObject<string | null>;
  setIsQuestionDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export type DebateSeriesUpdatePatch = {
  resultTitle: string;
  options: Array<{ text: string; color?: string | null; isCorrect?: boolean }>;
  rounds: Array<{ formIndex: number; text: string }>;
};

/** Клонирование серии, раунды, сохранение и удаление дебатов в редакторе вопросов. */
export function createAdminQuestionEditorDebateSeriesMutations(
  ctx: AdminQuestionEditorDebateSeriesCtx,
) {
  async function cloneDebateSeries(seriesId: string) {
    const trimmedSeriesId = seriesId.trim();
    if (!trimmedSeriesId) return;
    const members = ctx.questionForms
      .map((q, index) => ({ q, index }))
      .filter(
        ({ q }) =>
          q.subQuizId == null &&
          isDebatePollPreset(q) &&
          q.debateSeriesId?.trim() === trimmedSeriesId,
      )
      .sort(
        (a, b) => (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index,
      );
    if (members.length === 0) return;
    if (members.some(({ q }) => !q.id)) {
      ctx.setMessage("Сначала сохраните все раунды серии");
      return;
    }
    const newSeriesId = `dbs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const clones = members.map(({ q }) => {
      const cloned = cloneQuestionForm(q);
      return {
        ...cloned,
        debateSeriesId: newSeriesId,
        debateRoundIndex: q.debateRoundIndex ?? 0,
        debateSeriesResultTitle: q.debateSeriesResultTitle?.trim() || null,
        options: cloned.options.map(({ id: _optionId, ...option }) => option),
      };
    });
    const insertAt = members[members.length - 1]!.index + 1;
    const next = [...ctx.questionForms];
    next.splice(insertAt, 0, ...clones);
    const formErr = validateQuestionsForm(next);
    if (formErr) {
      ctx.setMessage(formErr);
      return;
    }
    ctx.setQuestionForms(next);
    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (merged === false) {
      ctx.setQuestionForms(ctx.questionForms);
      return;
    }
    const firstCloneIndex = merged.questions.findIndex(
      (q) => isDebatePollPreset(q) && q.debateSeriesId?.trim() === newSeriesId,
    );
    if (firstCloneIndex >= 0) {
      ctx.setSelectedQuestionIndex(firstCloneIndex);
    }
    ctx.questionDialogSnapshotRef.current = cloneQuestionForms(merged.questions);
    ctx.questionDialogTargetSubQuizIdRef.current = null;
    ctx.setMessage("Дебаты скопированы");
  }

  async function addDebateSeriesRoundAtIndex(globalIndex: number) {
    const source = ctx.questionForms[globalIndex];
    if (!source || !isDebatePollPreset(source)) {
      ctx.setMessage("Раунд можно добавить только к дебатам");
      return;
    }
    if (!source.id) {
      ctx.setMessage("Сначала сохраните голосование");
      return;
    }
    const seriesId =
      source.debateSeriesId?.trim() ||
      `dbs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const seriesMembers = ctx.questionForms
      .map((q, index) => ({ q, index }))
      .filter(
        ({ q, index }) =>
          q.subQuizId == null &&
          isDebatePollPreset(q) &&
          (q.debateSeriesId?.trim() === seriesId ||
            (!q.debateSeriesId?.trim() && index === globalIndex)),
      );
    const maxRound = Math.max(0, ...seriesMembers.map(({ q }) => q.debateRoundIndex ?? 0));
    const nextRoundIndex = maxRound + 1;
    const lastInSeries = [...seriesMembers].sort(
      (a, b) => (a.q.debateRoundIndex ?? 0) - (b.q.debateRoundIndex ?? 0) || a.index - b.index,
    )[seriesMembers.length - 1];
    const insertAt = (lastInSeries?.index ?? globalIndex) + 1;
    const patch = buildDebateSeriesNextRoundPatch({
      text: source.text.trim() || "Раунд дебатов",
      debateSeriesId: seriesId,
      debateRoundIndex: nextRoundIndex,
      options: withDebateOptionColors(source.options).map((o) => ({
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
        color: o.color,
      })),
    });
    const newRound: QuestionForm = {
      ...createEmptyQuestion(null),
      editorQuizMode: false,
      text: patch.text,
      type: patch.type,
      projectorDebateLayout: true,
      debateSeriesId: patch.debateSeriesId,
      debateRoundIndex: patch.debateRoundIndex,
      debateSeriesResultTitle: source.debateSeriesResultTitle?.trim() || null,
      options: patch.options.map((o) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        color: o.color,
      })),
      isActive: false,
      adminDone: false,
    };
    const prevIds = new Set(
      ctx.questionForms.map((q) => q.id).filter((id): id is string => Boolean(id)),
    );
    const next = ctx.questionForms.map((q, index) => {
      if (index !== globalIndex && q.debateSeriesId?.trim() !== seriesId) return q;
      if (!isDebatePollPreset(q)) return q;
      if (q.debateSeriesId?.trim()) return q;
      // Первый раунд без seriesId — закрепляем серию.
      if (index === globalIndex) {
        return { ...q, debateSeriesId: seriesId, debateRoundIndex: q.debateRoundIndex ?? 0 };
      }
      return q;
    });
    next.splice(insertAt, 0, newRound);
    if (!source.debateSeriesId?.trim()) {
      const srcPos = next.findIndex((q, i) => i !== insertAt && q.id === source.id);
      if (srcPos >= 0) {
        next[srcPos] = {
          ...next[srcPos]!,
          debateSeriesId: seriesId,
          debateRoundIndex: next[srcPos]!.debateRoundIndex ?? 0,
        };
      }
    }
    const formErr = validateQuestionsForm(next);
    if (formErr) {
      ctx.setMessage(formErr);
      return;
    }
    ctx.setQuestionForms(next);
    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (merged === false) {
      ctx.setQuestionForms(ctx.questionForms);
      return;
    }
    const newIndex = merged.questions.findIndex((q) => q.id && !prevIds.has(q.id));
    const targetIndex = newIndex >= 0 ? newIndex : insertAt;
    ctx.setSelectedQuestionIndex(targetIndex);
    ctx.questionDialogSnapshotRef.current = cloneQuestionForms(merged.questions);
    ctx.questionDialogTargetSubQuizIdRef.current = null;
    ctx.setIsQuestionDialogOpen(true);
    ctx.setMessage(`Добавлен раунд ${nextRoundIndex + 1}`);
  }

  async function updateDebateSeriesResultTitle(seriesId: string, rawTitle: string) {
    const trimmedSeriesId = seriesId.trim();
    if (!trimmedSeriesId) return;
    const nextTitle = rawTitle.trim() || null;
    const next = ctx.questionForms.map((q) => {
      if (!isDebatePollPreset(q) || q.debateSeriesId?.trim() !== trimmedSeriesId) return q;
      return { ...q, debateSeriesResultTitle: nextTitle };
    });
    ctx.setQuestionForms(next);
    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (merged === false) {
      ctx.setQuestionForms(ctx.questionForms);
    }
  }

  async function updateDebateSeries(seriesId: string, patch: DebateSeriesUpdatePatch) {
    const trimmedSeriesId = seriesId.trim();
    if (!trimmedSeriesId) return;
    const coloredOptions = withDebateOptionColors(
      patch.options.map((option) => ({
        text: option.text,
        isCorrect: Boolean(option.isCorrect),
        color: option.color,
      })),
    );
    if (coloredOptions.length < 2) {
      ctx.setMessage("В дебатах должно быть не меньше 2 вариантов");
      return;
    }
    const nextTitle = patch.resultTitle.trim() || null;
    const roundTextByIndex = new Map(
      patch.rounds.map((round) => [round.formIndex, round.text] as const),
    );
    const next = ctx.questionForms.map((q, index) => {
      if (!isDebatePollPreset(q) || q.debateSeriesId?.trim() !== trimmedSeriesId) return q;
      const roundText = roundTextByIndex.get(index);
      return {
        ...q,
        debateSeriesResultTitle: nextTitle,
        ...(roundText !== undefined ? { text: roundText } : {}),
        options: coloredOptions.map((src, optionIndex) => {
          const existing = q.options[optionIndex];
          return {
            id: existing?.id,
            text: src.text,
            isCorrect: Boolean(src.isCorrect),
            color: src.color,
            ...(existing?.imageUrl ? { imageUrl: existing.imageUrl } : {}),
          };
        }),
      };
    });
    const err = validateQuestionsForm(next);
    if (err) {
      ctx.setMessage(err);
      return;
    }
    ctx.setQuestionForms(next);
    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (merged === false) {
      ctx.setQuestionForms(ctx.questionForms);
      return;
    }
    ctx.setMessage("Дебаты сохранены");
  }

  async function removeDebateSeries(seriesId: string) {
    const trimmedSeriesId = seriesId.trim();
    if (!trimmedSeriesId) return;
    const removedIndices = new Set(
      ctx.questionForms
        .map((q, index) =>
          isDebatePollPreset(q) && q.debateSeriesId?.trim() === trimmedSeriesId ? index : -1,
        )
        .filter((index) => index >= 0),
    );
    if (removedIndices.size === 0) return;
    const next = ctx.questionForms.filter((_, index) => !removedIndices.has(index));
    const err = validateQuestionsForm(next);
    if (err) {
      ctx.setMessage(err);
      return;
    }
    ctx.setQuestionForms(next);
    ctx.setSelectedQuestionIndex((current) => {
      if (next.length === 0) return 0;
      const removedBefore = [...removedIndices].filter((index) => index < current).length;
      const adjusted = current - removedBefore;
      if (removedIndices.has(current)) return Math.max(0, Math.min(adjusted, next.length - 1));
      return Math.max(0, Math.min(adjusted, next.length - 1));
    });
    ctx.questionDialogSnapshotRef.current = null;
    ctx.questionDialogTargetSubQuizIdRef.current = null;
    ctx.setIsQuestionDialogOpen(false);
    const persisted = await ctx.persistQuestions(next, ctx.subQuizSheets);
    if (persisted !== false) {
      ctx.setMessage("Дебаты удалены");
      if (next.length === 0) ctx.setQuestionId("");
    }
  }

  return {
    cloneDebateSeries,
    addDebateSeriesRoundAtIndex,
    updateDebateSeriesResultTitle,
    updateDebateSeries,
    removeDebateSeries,
  };
}
