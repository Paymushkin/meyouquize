import type { QuestionForm } from "../../admin/adminEventForm";

type PublicResultsMode = "title" | "question" | "leaderboard" | "speaker_questions" | "reactions";

type FlowCtx = {
  question: QuestionForm;
  revealResultsOnProjector: boolean;
  chartsOnProjector: boolean;
  setMessage: (value: string) => void;
  setQuestionRevealStageForQuestion: (questionId: string, stage: "options" | "results") => void;
  setPublicResultsView: (mode: PublicResultsMode, questionIdForMode?: string) => void;
};

type RevealFlowCtx = Omit<FlowCtx, "chartsOnProjector">;

function ensureQuestionId(
  ctx: Pick<FlowCtx, "question" | "setMessage">,
): ctx is Pick<FlowCtx, "question" | "setMessage"> & { question: QuestionForm & { id: string } } {
  if (!ctx.question.id) {
    ctx.setMessage("Сначала сохраните вопрос");
    return false;
  }
  return true;
}

/** Кнопка «слайдшоу» / показ вопроса на проекторе в списке вопросов админки. */
export function runAdminQuestionSlideshowFlow(ctx: FlowCtx): void {
  if (!ensureQuestionId(ctx)) return;
  const { question } = ctx;
  if (ctx.revealResultsOnProjector) {
    ctx.setQuestionRevealStageForQuestion(question.id, "options");
    return;
  }
  if (ctx.chartsOnProjector) {
    ctx.setPublicResultsView("title");
    return;
  }
  if (question.type === "tag_cloud") {
    ctx.setQuestionRevealStageForQuestion(question.id, "options");
    return;
  }
  ctx.setPublicResultsView("question", question.id);
}

/** Кнопка «показать результаты» на проекторе в списке вопросов админки. */
export function runAdminQuestionRevealResultsFlow(ctx: RevealFlowCtx): void {
  if (!ensureQuestionId(ctx)) return;
  const { question } = ctx;
  if (question.type === "tag_cloud") {
    if (ctx.revealResultsOnProjector) {
      ctx.setPublicResultsView("title");
      return;
    }
    ctx.setQuestionRevealStageForQuestion(question.id, "results");
    return;
  }
  if (ctx.revealResultsOnProjector) {
    ctx.setPublicResultsView("title");
    return;
  }
  ctx.setQuestionRevealStageForQuestion(question.id, "results");
}
