import {
  collectTagCloudCorrectAliases,
  collectTagCloudQuizReferenceAliases,
  normalizeTagComparable,
  parseTagCloudReferenceAliases,
} from "@meyouquize/shared";
import {
  buildTagCloudReferenceTags,
  evaluateTagCloudSubmission,
  parseTagCloudTierPoints,
} from "./scoring.js";

const DEMO_WRONG_TAG_POOL = [
  "кофе",
  "пицца",
  "корабль",
  "пингвин",
  "карта",
  "фильм",
  "река",
  "гора",
  "планета",
];

export function pickTagCloudAlias(optionText: string, seed: number): string {
  const aliases = parseTagCloudReferenceAliases(optionText);
  if (aliases.length === 0) return normalizeTagComparable(optionText);
  const idx = Math.abs(Math.trunc(seed)) % aliases.length;
  return aliases[idx]!;
}

function pickUniqueTags(pool: string[], count: number): string[] {
  const unique: string[] = [];
  for (const t of pool) {
    const norm = normalizeTagComparable(t);
    if (!norm || unique.includes(norm)) continue;
    unique.push(norm);
    if (unique.length >= count) break;
  }
  return unique;
}

export type DemoTagCloudQuestion = {
  options: Array<{ text: string; isCorrect: boolean }>;
  maxAnswers?: number | null;
  points: number;
  rankingPointsByRank?: unknown;
  scoringMode: "QUIZ" | "POLL";
};

/** Генерирует демо-ответ и зачёт для вопроса «облако тегов». */
export function buildDemoTagCloudAnswer(
  q: DemoTagCloudQuestion,
  chooseCorrect: boolean,
  seed: number,
): { selectedTags: string[]; isCorrect: boolean; scoreAwarded: number } {
  const referenceOptions =
    q.scoringMode === "QUIZ"
      ? q.options.filter((o) => o.text.trim())
      : q.options.filter((o) => o.isCorrect);
  const correctAliasSet = new Set(
    q.scoringMode === "QUIZ"
      ? collectTagCloudQuizReferenceAliases(q.options)
      : collectTagCloudCorrectAliases(q.options),
  );
  const correctOptions = referenceOptions;
  const maxAnswers = Math.max(1, Math.trunc(q.maxAnswers ?? 3));
  const wrongPool = DEMO_WRONG_TAG_POOL.filter(
    (t) => !correctAliasSet.has(normalizeTagComparable(t)),
  );

  if (correctOptions.length === 0) {
    return { selectedTags: [], isCorrect: false, scoreAwarded: 0 };
  }

  let selectedTags: string[];
  if (chooseCorrect) {
    selectedTags = correctOptions
      .slice(0, maxAnswers)
      .map((o, i) => pickTagCloudAlias(o.text, seed * 19 + i * 5))
      .filter(Boolean);
  } else {
    const partialGroups = Math.max(1, Math.min(correctOptions.length - 1, maxAnswers - 1));
    const correctPart = correctOptions
      .slice(0, partialGroups)
      .map((o, i) => pickTagCloudAlias(o.text, seed * 23 + i * 7));
    const wrongPart = pickUniqueTags(wrongPool, maxAnswers - correctPart.length);
    selectedTags = [...correctPart, ...wrongPart].slice(0, maxAnswers);
  }

  if (q.scoringMode === "QUIZ") {
    const referenceTags = buildTagCloudReferenceTags(
      q.options,
      parseTagCloudTierPoints(q.rankingPointsByRank),
      "quiz-all",
    );
    const evaluated = evaluateTagCloudSubmission({
      referenceTags,
      userTagsComparable: selectedTags,
      maxAnswers,
      fullCreditPoints: q.points,
      scoringMode: "quiz",
    });
    return {
      selectedTags,
      isCorrect: evaluated.isCorrect,
      scoreAwarded: evaluated.scoreAwarded,
    };
  }

  const selectedSet = new Set(selectedTags);
  return {
    selectedTags,
    isCorrect: [...selectedSet].some((t) => correctAliasSet.has(t)),
    scoreAwarded: 0,
  };
}
