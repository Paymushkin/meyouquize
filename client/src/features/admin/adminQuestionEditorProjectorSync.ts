import type { Dispatch, SetStateAction } from "react";
import { isDebatePollPreset } from "@meyouquize/shared";
import {
  applyVotesDisplayBlocksReorder,
  buildVotesDisplayBlocks,
  filterVotesDisplayBlocks,
  type QuestionForm,
  type SubQuizSheet,
} from "../../admin/adminEventForm";
import type { PublicViewMode, PublicViewSetPatch } from "../../publicViewContract";

export type AdminQuestionEditorProjectorSyncCtx = {
  quizId: string;
  questionForms: QuestionForm[];
  subQuizSheets: SubQuizSheet[];
  setQuestionForms: Dispatch<SetStateAction<QuestionForm[]>>;
  setMessage: (message: string) => void;
  persistQuestions: (
    forms: QuestionForm[],
    sheets: SubQuizSheet[],
    opts?: { suppressToast?: boolean },
  ) => Promise<false | { questions: QuestionForm[] }>;
  patchQuestionProjectorSettings: (
    questionId: string,
    patch: Record<string, unknown>,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => Promise<boolean>;
  patchQuestionAdminDone: (
    questionId: string,
    adminDone: boolean,
    sheets: SubQuizSheet[],
    forms: QuestionForm[],
    quizIdForRefresh: string,
  ) => Promise<boolean>;
  publicViewMode: PublicViewMode;
  publicViewQuestionId: string | undefined;
  setPublicViewMode: Dispatch<SetStateAction<PublicViewMode>>;
  setPublicViewQuestionId: Dispatch<SetStateAction<string | undefined>>;
  setPublicDebateCompareQuestionId: Dispatch<SetStateAction<string | undefined>>;
  setQuestionRevealStage: Dispatch<SetStateAction<"options" | "results">>;
  emitPublicViewSet: (patch: PublicViewSetPatch) => void;
  resultsSubQuizId: string;
  setResultsSubQuizId: Dispatch<SetStateAction<string>>;
  setShowFirstCorrectAnswerer: Dispatch<SetStateAction<boolean>>;
};

/** Публичный экран, флаги проектора, adminDone и reorder голосований. */
export function createAdminQuestionEditorProjectorSync(ctx: AdminQuestionEditorProjectorSyncCtx) {
  function setPublicResultsView(
    mode:
      | "title"
      | "question"
      | "leaderboard"
      | "speaker_questions"
      | "reactions"
      | "randomizer"
      | "photo_wall"
      | "video_wall"
      | "debate_compare"
      | "debate_series",
    questionIdForMode?: string,
    extraPatch?: PublicViewSetPatch,
  ) {
    if (!ctx.quizId) {
      ctx.setMessage("Quiz ID не найден");
      return;
    }
    const nextQuestionId =
      mode === "question" || mode === "debate_series" ? questionIdForMode : undefined;
    const nextDebateCompareQuestionId = mode === "debate_compare" ? questionIdForMode : undefined;
    if (mode === "question" && !nextQuestionId) {
      ctx.setMessage("Не найден вопрос для экрана");
      return;
    }
    if (mode === "debate_compare" && !nextDebateCompareQuestionId) {
      ctx.setMessage("Не найден финальный вопрос дебатов");
      return;
    }
    if (mode === "debate_compare") {
      const finalQuestion = ctx.questionForms.find((q) => q.id === nextDebateCompareQuestionId);
      if (!finalQuestion?.debateBaselineQuestionId?.trim()) {
        ctx.setMessage("У финального вопроса не указан baseline-опрос «до»");
        return;
      }
    }
    let nextDebateSeriesId: string | undefined;
    if (mode === "debate_series") {
      const seedQuestion = ctx.questionForms.find((q) => q.id === questionIdForMode);
      nextDebateSeriesId =
        (typeof extraPatch?.debateSeriesId === "string" ? extraPatch.debateSeriesId.trim() : "") ||
        seedQuestion?.debateSeriesId?.trim() ||
        undefined;
      if (!nextDebateSeriesId) {
        ctx.setMessage("У дебатов не задана серия");
        return;
      }
    }
    const resolvedSeriesQuestionId =
      mode === "debate_series"
        ? nextQuestionId ||
          [...ctx.questionForms]
            .filter(
              (q) =>
                q.subQuizId == null &&
                isDebatePollPreset(q) &&
                q.debateSeriesId?.trim() === nextDebateSeriesId,
            )
            .sort((a, b) => (a.debateRoundIndex ?? 0) - (b.debateRoundIndex ?? 0))
            .at(-1)?.id
        : nextQuestionId;
    if (mode === "debate_series" && !resolvedSeriesQuestionId) {
      ctx.setMessage("Не найден раунд серии для экрана");
      return;
    }
    const targetQuestion =
      (mode === "question" || mode === "debate_series") && resolvedSeriesQuestionId
        ? ctx.questionForms.find((q) => q.id === resolvedSeriesQuestionId)
        : undefined;
    const nextQuestionRevealStage =
      mode === "debate_compare" || mode === "debate_series"
        ? "results"
        : mode === "question" && targetQuestion?.type !== "tag_cloud"
          ? "options"
          : "results";
    const leaderboardSubQuizIdForEmit =
      mode === "leaderboard"
        ? (extraPatch?.leaderboardSubQuizId ?? ctx.resultsSubQuizId ?? "").trim() || undefined
        : undefined;
    if (mode === "leaderboard" && leaderboardSubQuizIdForEmit) {
      ctx.setResultsSubQuizId(leaderboardSubQuizIdForEmit);
    }
    ctx.setShowFirstCorrectAnswerer(false);
    ctx.setPublicViewMode(mode);
    ctx.setPublicViewQuestionId(
      mode === "question" || mode === "debate_series" ? resolvedSeriesQuestionId : undefined,
    );
    ctx.setPublicDebateCompareQuestionId(
      mode === "debate_compare" ? nextDebateCompareQuestionId : undefined,
    );
    ctx.setQuestionRevealStage(nextQuestionRevealStage);
    ctx.emitPublicViewSet({
      mode,
      questionId: resolvedSeriesQuestionId,
      debateCompareQuestionId: nextDebateCompareQuestionId,
      debateSeriesId: nextDebateSeriesId,
      debateSeriesView: mode === "debate_series" ? "cumulative" : undefined,
      showCorrectOption: targetQuestion?.showCorrectOption ?? false,
      showFirstCorrectAnswerer: false,
      ...(leaderboardSubQuizIdForEmit ? { leaderboardSubQuizId: leaderboardSubQuizIdForEmit } : {}),
      ...extraPatch,
      // После extraPatch: накопительный итог / сравнение всегда с графиками, не с карточками вариантов.
      questionRevealStage:
        mode === "debate_series" || mode === "debate_compare"
          ? "results"
          : (extraPatch?.questionRevealStage ?? nextQuestionRevealStage),
    });
  }

  function setQuestionRevealStageForQuestion(
    questionIdForProjector: string,
    stage: "options" | "results",
  ) {
    if (!ctx.quizId) {
      ctx.setMessage("Quiz ID не найден");
      return;
    }
    ctx.setPublicViewMode("question");
    ctx.setPublicViewQuestionId(questionIdForProjector);
    ctx.setQuestionRevealStage(stage);
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: questionIdForProjector,
      questionRevealStage: stage,
      showFirstCorrectAnswerer: false,
    });
  }
  function updateQuestionShowVoteCount(questionIndex: number, next: boolean) {
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showVoteCount: next } : q)),
    );
    const question = ctx.questionForms[questionIndex];
    if (
      !ctx.quizId ||
      ctx.publicViewMode !== "question" ||
      !question?.id ||
      ctx.publicViewQuestionId !== question.id
    )
      return;
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: next,
      geoPollShowAnswerList: question.geoPollShowAnswerList ?? true,
      geoPollRegionHeatEnabled: question.geoPollRegionHeatEnabled ?? false,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionGeoPollShowAnswerList(questionIndex: number, next: boolean) {
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, geoPollShowAnswerList: next } : q)),
    );
    const question = ctx.questionForms[questionIndex];
    if (
      !ctx.quizId ||
      ctx.publicViewMode !== "question" ||
      !question?.id ||
      ctx.publicViewQuestionId !== question.id
    )
      return;
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      geoPollShowAnswerList: next,
      geoPollRegionHeatEnabled: question.geoPollRegionHeatEnabled ?? false,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionGeoPollRegionHeatEnabled(questionIndex: number, next: boolean) {
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, geoPollRegionHeatEnabled: next } : q)),
    );
    const question = ctx.questionForms[questionIndex];
    if (
      !ctx.quizId ||
      ctx.publicViewMode !== "question" ||
      !question?.id ||
      ctx.publicViewQuestionId !== question.id
    )
      return;
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      geoPollShowAnswerList: question.geoPollShowAnswerList ?? true,
      geoPollRegionHeatEnabled: next,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowCorrectOption(questionIndex: number, next: boolean) {
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showCorrectOption: next } : q)),
    );
    const question = ctx.questionForms[questionIndex];
    if (
      !ctx.quizId ||
      ctx.publicViewMode !== "question" ||
      !question?.id ||
      ctx.publicViewQuestionId !== question.id
    )
      return;
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      geoPollShowAnswerList: question.geoPollShowAnswerList ?? true,
      geoPollRegionHeatEnabled: question.geoPollRegionHeatEnabled ?? false,
      showCorrectOption: next,
      showQuestionTitle: question.showQuestionTitle ?? true,
    });
  }

  function updateQuestionShowTitle(questionIndex: number, next: boolean) {
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, showQuestionTitle: next } : q)),
    );
    const question = ctx.questionForms[questionIndex];
    if (
      !ctx.quizId ||
      ctx.publicViewMode !== "question" ||
      !question?.id ||
      ctx.publicViewQuestionId !== question.id
    )
      return;
    ctx.emitPublicViewSet({
      mode: "question",
      questionId: question.id,
      showVoteCount: question.showVoteCount ?? false,
      geoPollShowAnswerList: question.geoPollShowAnswerList ?? true,
      geoPollRegionHeatEnabled: question.geoPollRegionHeatEnabled ?? false,
      showCorrectOption: question.showCorrectOption ?? false,
      showQuestionTitle: next,
    });
  }

  async function toggleQuestionAdminDone(globalIndex: number) {
    const prev = ctx.questionForms[globalIndex];
    if (!prev?.id) {
      ctx.setMessage("Сначала сохраните вопрос");
      return;
    }
    const nextDone = !prev.adminDone;
    const nextForms = ctx.questionForms.map((q, idx) =>
      idx === globalIndex ? { ...q, adminDone: nextDone } : q,
    );
    ctx.setQuestionForms(nextForms);
    const ok = await ctx.patchQuestionAdminDone(
      prev.id,
      nextDone,
      ctx.subQuizSheets,
      nextForms,
      ctx.quizId,
    );
    if (!ok) {
      ctx.setQuestionForms((forms) =>
        forms.map((q, idx) => (idx === globalIndex ? { ...q, adminDone: prev.adminDone } : q)),
      );
    }
  }

  /** Пометить все раунды серии (или набор индексов) отработанными / актуальными. */
  async function setQuestionsAdminDone(globalIndices: number[], adminDone: boolean) {
    const targets = globalIndices
      .map((index) => ({ index, q: ctx.questionForms[index] }))
      .filter((row): row is { index: number; q: QuestionForm } => Boolean(row.q));
    if (targets.length === 0) return;
    if (targets.some((row) => !row.q.id)) {
      ctx.setMessage("Сначала сохраните все раунды серии");
      return;
    }

    const indexSet = new Set(targets.map((row) => row.index));
    const snapshot = ctx.questionForms;
    const nextForms = ctx.questionForms.map((q, idx) =>
      indexSet.has(idx) ? { ...q, adminDone } : q,
    );
    ctx.setQuestionForms(nextForms);

    for (const { q } of targets) {
      const ok = await ctx.patchQuestionAdminDone(
        q.id!,
        adminDone,
        ctx.subQuizSheets,
        nextForms,
        ctx.quizId,
      );
      if (!ok) {
        ctx.setQuestionForms(snapshot);
        return;
      }
    }
  }

  async function reorderVoteInList(
    fromLocalIndex: number,
    toLocalIndex: number,
    scopeIndices: number[],
  ) {
    if (fromLocalIndex === toLocalIndex) return;
    if (
      fromLocalIndex < 0 ||
      toLocalIndex < 0 ||
      fromLocalIndex >= scopeIndices.length ||
      toLocalIndex >= scopeIndices.length
    ) {
      return;
    }

    const orderedGlobals = [...scopeIndices];
    const [removed] = orderedGlobals.splice(fromLocalIndex, 1);
    if (removed === undefined) return;
    orderedGlobals.splice(toLocalIndex, 0, removed);

    const scopePositions = [...scopeIndices].sort((a, b) => a - b);
    const reorderedQuestions = orderedGlobals.map((globalIndex) => ctx.questionForms[globalIndex]!);

    const snapshot = ctx.questionForms;
    const next = [...ctx.questionForms];
    scopePositions.forEach((position, index) => {
      next[position] = reorderedQuestions[index]!;
    });
    ctx.setQuestionForms(next);

    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (!merged) {
      ctx.setQuestionForms(snapshot);
      ctx.setMessage("Не удалось изменить порядок");
    }
  }

  async function reorderVoteDisplayBlocks(
    fromBlockIndex: number,
    toBlockIndex: number,
    scopeIndices: number[],
  ) {
    const blocks = filterVotesDisplayBlocks(
      buildVotesDisplayBlocks(ctx.questionForms),
      new Set(scopeIndices),
    );
    const next = applyVotesDisplayBlocksReorder(
      ctx.questionForms,
      blocks,
      fromBlockIndex,
      toBlockIndex,
    );
    if (!next) return;

    const snapshot = ctx.questionForms;
    ctx.setQuestionForms(next);
    const merged = await ctx.persistQuestions(next, ctx.subQuizSheets, { suppressToast: true });
    if (!merged) {
      ctx.setQuestionForms(snapshot);
      ctx.setMessage("Не удалось изменить порядок");
    }
  }

  async function updateQuestionProjectorShowFirstCorrect(questionIndex: number, next: boolean) {
    const prev = ctx.questionForms[questionIndex];
    if (!prev?.id) {
      ctx.setMessage("Сначала сохраните вопрос");
      return;
    }
    const previousSwitch = prev.projectorShowFirstCorrect ?? true;
    const nextForms = ctx.questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, projectorShowFirstCorrect: next } : q,
    );
    ctx.setQuestionForms(nextForms);
    const ok = await ctx.patchQuestionProjectorSettings(
      prev.id,
      { projectorShowFirstCorrect: next },
      ctx.subQuizSheets,
      nextForms,
      ctx.quizId,
    );
    if (!ok) {
      ctx.setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, projectorShowFirstCorrect: previousSwitch } : q,
        ),
      );
    }
  }

  async function updateQuestionRankingProjectorMetric(
    questionIndex: number,
    value: "avg_rank" | "avg_score" | "total_score",
  ) {
    const prev = ctx.questionForms[questionIndex];
    if (!prev?.id) {
      ctx.setMessage("Сначала сохраните вопрос");
      return;
    }
    if (prev.type !== "ranking") return;
    const previousMetric = prev.rankingProjectorMetric ?? "avg_score";
    const nextForms = ctx.questionForms.map((q, idx) =>
      idx === questionIndex ? { ...q, rankingProjectorMetric: value } : q,
    );
    ctx.setQuestionForms(nextForms);
    const ok = await ctx.patchQuestionProjectorSettings(
      prev.id,
      { rankingProjectorMetric: value },
      ctx.subQuizSheets,
      nextForms,
      ctx.quizId,
    );
    if (!ok) {
      ctx.setQuestionForms((forms) =>
        forms.map((q, idx) =>
          idx === questionIndex ? { ...q, rankingProjectorMetric: previousMetric } : q,
        ),
      );
    }
  }

  function patchQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, next: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(next) ? next : 1)));
    ctx.setQuestionForms((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      ),
    );
  }

  function commitQuestionProjectorFirstCorrectWinnersCount(questionIndex: number, raw: number) {
    const safe = Math.max(1, Math.min(20, Math.trunc(Number.isFinite(raw) ? raw : 1)));
    ctx.setQuestionForms((prev) => {
      const previousCount = prev[questionIndex]?.projectorFirstCorrectWinnersCount ?? 1;
      const qid = prev[questionIndex]?.id;
      const nextForms = prev.map((q, idx) =>
        idx === questionIndex ? { ...q, projectorFirstCorrectWinnersCount: safe } : q,
      );
      queueMicrotask(() => {
        void (async () => {
          if (!qid) {
            ctx.setMessage("Сначала сохраните вопрос");
            ctx.setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
            return;
          }
          const ok = await ctx.patchQuestionProjectorSettings(
            qid,
            { projectorFirstCorrectWinnersCount: safe },
            ctx.subQuizSheets,
            nextForms,
            ctx.quizId,
          );
          if (!ok) {
            ctx.setQuestionForms((p) =>
              p.map((q, idx) =>
                idx === questionIndex
                  ? { ...q, projectorFirstCorrectWinnersCount: previousCount }
                  : q,
              ),
            );
          }
        })();
      });
      return nextForms;
    });
  }

  return {
    setPublicResultsView,
    setQuestionRevealStageForQuestion,
    updateQuestionShowVoteCount,
    updateQuestionGeoPollShowAnswerList,
    updateQuestionGeoPollRegionHeatEnabled,
    updateQuestionShowCorrectOption,
    updateQuestionShowTitle,
    toggleQuestionAdminDone,
    setQuestionsAdminDone,
    reorderVoteInList,
    reorderVoteDisplayBlocks,
    updateQuestionProjectorShowFirstCorrect,
    updateQuestionRankingProjectorMetric,
    patchQuestionProjectorFirstCorrectWinnersCount,
    commitQuestionProjectorFirstCorrectWinnersCount,
  };
}
