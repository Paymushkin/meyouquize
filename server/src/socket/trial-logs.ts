import { env } from "../env.js";

type TrialLogPayload = Record<string, unknown>;
type TrialEvent =
  | "quiz_join_ok"
  | "quiz_join_error"
  | "answer_submit_rate_limited"
  | "answer_submit_ok"
  | "answer_submit_error"
  | "admin_question_toggle"
  | "admin_sub_quiz_start_auto"
  | "broadcast_state_quiz";

type TrialQuizProgressLike = {
  index?: number | null;
  total?: number | null;
  questionFlowMode?: string | null;
} | null;

type TrialQuizStateLike =
  | {
      activeQuestions?: unknown[] | null;
      activeQuestion?: { id?: string | null } | null;
      quizProgress?: TrialQuizProgressLike;
    }
  | null
  | undefined;

function sanitizePayload(payload: TrialLogPayload): TrialLogPayload {
  const out: TrialLogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.length > 180) {
      out[key] = `${value.slice(0, 177)}...`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function trialLog(event: TrialEvent, payload: TrialLogPayload): void {
  if (!env.trialLogsEnabled) return;
  console.info(
    JSON.stringify({
      scope: "trial",
      event,
      ts: new Date().toISOString(),
      ...sanitizePayload(payload),
    }),
  );
}

export function trialSocketPayload(socketId: string): Pick<TrialLogPayload, "socketId"> {
  return { socketId };
}

export function trialErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function trialQuizStatePayload(state: TrialQuizStateLike): TrialLogPayload {
  return {
    activeQuestions: state?.activeQuestions?.length ?? 0,
    activeQuestionId: state?.activeQuestion?.id ?? null,
    progressIndex: state?.quizProgress?.index ?? null,
    progressTotal: state?.quizProgress?.total ?? null,
    progressFlowMode: state?.quizProgress?.questionFlowMode ?? null,
  };
}
