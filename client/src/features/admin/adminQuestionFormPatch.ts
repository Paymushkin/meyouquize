import { DEFAULT_TEMPERATURE_OPTION_WEIGHTS } from "@meyouquize/shared";
import {
  isEditorQuizMode,
  normalizeTagCloudQuestionPoints,
  type OptionForm,
  type QuestionForm,
} from "../../admin/adminEventForm";

export type RankingHintDefaults = {
  quiz: string;
  jury: string;
};

export function patchQuestionForm(
  q: QuestionForm,
  patch: Partial<QuestionForm>,
  rankingHints: RankingHintDefaults,
): QuestionForm {
  const next = { ...q, ...patch };
  if (patch.type === "tag_cloud") {
    next.editorQuizMode = true;
    if (next.options.length < 2) {
      next.options = [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ];
    }
    if (isEditorQuizMode(next)) {
      return normalizeTagCloudQuestionPoints(next);
    }
    if (!next.options.some((o) => o.isCorrect)) {
      next.options = next.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
    }
  } else if (patch.type === "ranking") {
    next.editorQuizMode = true;
    next.rankingKind = next.rankingKind ?? "jury";
    if (!next.rankingPlayerHint?.trim()) {
      next.rankingPlayerHint = next.rankingKind === "quiz" ? rankingHints.quiz : rankingHints.jury;
    }
    if (next.rankingProjectorMetric == null) {
      next.rankingProjectorMetric = "avg_score";
    }
    if (next.options.length < 3) {
      const pad = 3 - next.options.length;
      next.options = [
        ...next.options,
        ...Array.from({ length: pad }, () => ({ text: "", isCorrect: false })),
      ];
    }
    {
      const n = next.options.length;
      next.rankingPointsByRank =
        next.rankingKind === "jury"
          ? Array.from({ length: n }, (_, j) => Math.max(1, n - j))
          : Array.from({ length: n }, (_, j) => j + 1);
    }
  } else if (patch.type === "single" || patch.type === "multi") {
    if (q.type === "tag_cloud") {
      next.editorQuizMode = true;
      if (next.options.length > 0 && !next.options.some((o) => o.isCorrect)) {
        next.options = next.options.map((o, idx) => ({ ...o, isCorrect: idx === 0 }));
      }
    }
  } else if (patch.type === "temperature") {
    next.editorQuizMode = false;
    if (next.options.length < 2) {
      next.options = DEFAULT_TEMPERATURE_OPTION_WEIGHTS.map((weight) => ({
        text: "",
        isCorrect: false,
        weight,
      }));
    } else {
      next.options = next.options.map((o, idx) => ({
        ...o,
        isCorrect: false,
        weight: o.weight ?? DEFAULT_TEMPERATURE_OPTION_WEIGHTS[idx] ?? 50,
      }));
    }
  }
  if (patch.type === "single" && isEditorQuizMode(next)) {
    let firstCorrect = next.options.findIndex((o) => o.isCorrect);
    if (firstCorrect === -1 && next.options.length > 0) {
      firstCorrect = 0;
    }
    next.options = next.options.map((o, optIdx) => ({
      ...o,
      isCorrect: optIdx === firstCorrect && firstCorrect !== -1,
    }));
  }
  return next;
}

export function patchQuestionAtIndex(
  forms: QuestionForm[],
  index: number,
  patch: Partial<QuestionForm>,
  rankingHints: RankingHintDefaults,
): QuestionForm[] {
  return forms.map((q, i) => (i === index ? patchQuestionForm(q, patch, rankingHints) : q));
}

export function patchOptionAtIndex(
  forms: QuestionForm[],
  questionIndex: number,
  optionIndex: number,
  patch: Partial<OptionForm>,
): QuestionForm[] {
  return forms.map((q, i) => {
    if (i !== questionIndex) return q;
    const nextOptions = q.options.map((o, oi) => {
      if (oi !== optionIndex) return o;
      return { ...o, ...patch };
    });
    if (q.type === "single" && patch.isCorrect) {
      return {
        ...q,
        options: nextOptions.map((o, oi) => ({ ...o, isCorrect: oi === optionIndex })),
      };
    }
    if (q.type === "tag_cloud" && isEditorQuizMode(q)) {
      return {
        ...q,
        options: nextOptions.map((o) =>
          o.text.trim() ? { ...o, isCorrect: true } : { ...o, isCorrect: false },
        ),
      };
    }
    return { ...q, options: nextOptions };
  });
}

export function cloneQuestionForms(forms: QuestionForm[]): QuestionForm[] {
  return JSON.parse(JSON.stringify(forms)) as QuestionForm[];
}
