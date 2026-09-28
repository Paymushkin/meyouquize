import {
  GEO_POLL_DICTIONARY_WORLD_CITIES,
  GEO_POLL_DICTIONARY_WORLD_COUNTRIES,
} from "./geoPollDictionaries.js";
import { debateDefaultOptionColor, sanitizeOptionColor } from "./optionColor.js";

export const GEO_POLL_DEFAULT_QUESTION_TEXT = "Откуда вы?";
export const DEBATE_POLL_DEFAULT_QUESTION_TEXT = "С чьей позицией вы согласны?";

export type PollOptionPreset = { text: string; isCorrect: boolean; color?: string };

export function debatePollOptions(): PollOptionPreset[] {
  return [
    { text: "Вариант A", isCorrect: false, color: debateDefaultOptionColor(0) },
    { text: "Вариант B", isCorrect: false, color: debateDefaultOptionColor(1) },
    { text: "Не определился", isCorrect: false, color: debateDefaultOptionColor(2) },
  ];
}

export function isGeoPollPreset(input: {
  type?: string;
  subQuizId?: string | null;
  editorQuizMode?: boolean;
  geoPollDictionary?: string | null;
  options: Array<{ text?: string }>;
}): boolean {
  if (input.type !== "single" && input.type !== "SINGLE") return false;
  if (input.subQuizId != null) return false;
  if (input.editorQuizMode) return false;
  return (
    input.geoPollDictionary === GEO_POLL_DICTIONARY_WORLD_CITIES ||
    input.geoPollDictionary === GEO_POLL_DICTIONARY_WORLD_COUNTRIES
  );
}

export function isDebatePollPreset(input: {
  type?: string;
  subQuizId?: string | null;
  editorQuizMode?: boolean;
  projectorDebateLayout?: boolean;
  options: Array<{ text?: string }>;
}): boolean {
  if (input.type !== "single" && input.type !== "SINGLE") return false;
  if (input.subQuizId != null) return false;
  if (input.editorQuizMode) return false;
  if (input.projectorDebateLayout !== true) return false;
  const count = input.options.length;
  return count >= 2 && count <= 3;
}

/** Проставляет цвет каждому варианту дебатов (сохранённый или дефолт по индексу). */
export function withDebateOptionColors<T extends { color?: string | null }>(
  options: T[],
): Array<T & { color: string }> {
  return options.map((option, index) => ({
    ...option,
    color:
      sanitizeOptionColor(option.color, debateDefaultOptionColor(index)) ??
      debateDefaultOptionColor(index),
  }));
}

export function buildGeoPollQuestionPatch(currentText?: string): {
  text: string;
  type: "single";
  editorQuizMode: false;
  projectorDebateLayout: false;
  debateBaselineQuestionId: null;
  geoPollDictionary: typeof GEO_POLL_DICTIONARY_WORLD_CITIES;
  options: PollOptionPreset[];
} {
  return {
    text: currentText?.trim() || GEO_POLL_DEFAULT_QUESTION_TEXT,
    type: "single",
    editorQuizMode: false,
    projectorDebateLayout: false,
    debateBaselineQuestionId: null,
    geoPollDictionary: GEO_POLL_DICTIONARY_WORLD_CITIES,
    options: [],
  };
}

export function buildDebatePollQuestionPatch(currentText?: string): {
  text: string;
  type: "single";
  editorQuizMode: false;
  projectorDebateLayout: true;
  debateSeriesId: string;
  debateRoundIndex: number;
  options: PollOptionPreset[];
} {
  return {
    text: currentText?.trim() || DEBATE_POLL_DEFAULT_QUESTION_TEXT,
    type: "single",
    editorQuizMode: false,
    projectorDebateLayout: true,
    debateSeriesId: `dbs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    debateRoundIndex: 0,
    options: debatePollOptions(),
  };
}

/** Клон следующего раунда серии с теми же сторонами. */
export function buildDebateSeriesNextRoundPatch(input: {
  text: string;
  debateSeriesId: string;
  debateRoundIndex: number;
  options: PollOptionPreset[];
}): {
  text: string;
  type: "single";
  editorQuizMode: false;
  projectorDebateLayout: true;
  debateSeriesId: string;
  debateRoundIndex: number;
  options: PollOptionPreset[];
} {
  return {
    text: input.text,
    type: "single",
    editorQuizMode: false,
    projectorDebateLayout: true,
    debateSeriesId: input.debateSeriesId,
    debateRoundIndex: input.debateRoundIndex,
    options: withDebateOptionColors(input.options).map((o) => ({
      text: o.text,
      isCorrect: Boolean(o.isCorrect),
      color: o.color,
    })),
  };
}
