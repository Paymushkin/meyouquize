import type {
  CloudManualStateByQuestion,
  CloudWordCount,
  PublicViewPayload,
} from "../publicViewContract";
import {
  inferQuestionUseImages,
  optionHasTextOrImage,
} from "../features/quizPlay/voteOptionImages";

/** Голосования комнаты: вопросы с subQuizId === null не привязаны к квизу. */

export type QuestionType = "single" | "multi" | "tag_cloud" | "ranking" | "temperature";

export type OptionForm = {
  id?: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  /** Для temperature: вес варианта 0–100. */
  weight?: number;
};

export type QuestionForm = {
  id?: string;
  /** Привязка к квизу комнаты; null — отдельное голосование */
  subQuizId?: string | null;
  text: string;
  imageUrl?: string;
  /** Режим редактора/показа: картинки у вопроса и (кроме tag_cloud) у вариантов. */
  useImages?: boolean;
  type: QuestionType;
  /** В подквизе: переключатель опрос/квиз (баллы). У голосований комнаты не используется для single/multi — правильные ответы задаются всегда (без баллов). */
  editorQuizMode: boolean;
  points: number;
  maxAnswers: number;
  /** Только UI админки: корзина «отработанные» (голосования комнаты). */
  adminDone?: boolean;
  isActive?: boolean;
  showVoteCount?: boolean;
  showCorrectOption?: boolean;
  showQuestionTitle?: boolean;
  /** Голосование комнаты: показывать победителей на проекторе (вместе с переключателем в «Результаты»). */
  projectorShowFirstCorrect?: boolean;
  /** Сколько первых верно ответивших выводить на проекторе (1–20). */
  projectorFirstCorrectWinnersCount?: number;
  hiddenTagTexts?: string[];
  injectedTagWords?: CloudWordCount[];
  tagCountOverrides?: CloudWordCount[];
  optionVoteCountOverrides?: CloudWordCount[];
  injectedTagsInput?: string;
  /** Для ranking: баллы за совпадение на каждой позиции (индекс 0 = лучшее место). null — только полный ответ даёт поле `points`. */
  rankingPointsByRank?: number[] | null;
  /** Для ranking: что показывать на проекторе */
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  /** Для ranking: квиз с эталоном или жюри (без верного ответа, без зачёта в лидерборд) */
  rankingKind?: "quiz" | "jury";
  /** Для ranking: кастомная подсказка игроку; пусто = текст по умолчанию на экране ответа. */
  rankingPlayerHint?: string;
  /** Для temperature: подзаголовок на проекторе над шкалой. */
  temperatureSubtitle?: string;
  options: OptionForm[];
};

export function prismaQuestionTypeToFormType(type: AdminEventRoomQuestion["type"]): QuestionType {
  switch (type) {
    case "SINGLE":
      return "single";
    case "MULTI":
      return "multi";
    case "RANKING":
      return "ranking";
    case "TEMPERATURE":
      return "temperature";
    default:
      return "tag_cloud";
  }
}

export type AdminEventRoomQuestion = {
  id: string;
  text: string;
  imageUrl?: string | null;
  type: "SINGLE" | "MULTI" | "TAG_CLOUD" | "RANKING" | "TEMPERATURE";
  points: number;
  maxAnswers: number;
  isActive: boolean;
  adminDone?: boolean;
  order: number;
  subQuizId?: string | null;
  scoringMode?: "POLL" | "QUIZ";
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  rankingPointsByRank?: unknown;
  rankingProjectorMetric?: string;
  rankingKind?: string;
  rankingPlayerHint?: string | null;
  temperatureSubtitle?: string | null;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    sortOrder?: number;
    imageUrl?: string | null;
    weight?: number | null;
  }>;
};

export type AdminEventSubQuiz = {
  id: string;
  title: string;
  questionFlowMode?: "MANUAL" | "AUTO";
  sortOrder: number;
  currentQuestionIndex: number;
};

/** Для SINGLE на сервере не должно быть >1 правильного; иначе валидатор и UI расходятся. */
function normalizeSingleCorrectFlags<T extends { isCorrect: boolean }>(
  questionType: AdminEventRoomQuestion["type"],
  options: T[],
): T[] {
  if (questionType === "RANKING") return options;
  if (questionType !== "SINGLE") return options;
  const first = options.findIndex((o) => o.isCorrect);
  if (first === -1) return options;
  return options.map((o, i) => ({ ...o, isCorrect: i === first }));
}

export type AdminEventRoom = {
  id: string;
  slug: string;
  title: string;
  subQuizzes: AdminEventSubQuiz[];
  questions: AdminEventRoomQuestion[];
  /** Состояние экрана результатов и брендирования с сервера (PostgreSQL) */
  publicView?: PublicViewPayload | null;
};

export type SubQuizSheet = { id: string; title: string; questionFlowMode: "manual" | "auto" };

function parseRankingPointsFromApi(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const nums: number[] = [];
  for (const x of raw) {
    const n = typeof x === "number" ? x : Number(x);
    if (!Number.isFinite(n)) return null;
    nums.push(Math.trunc(n));
  }
  return nums.length > 0 ? nums : null;
}

/** Баллы за эталонный тег по индексу строки (в UI по умолчанию 1). */
export function tagCloudPointsForOption(q: QuestionForm, optionIndex: number): number {
  const v = q.rankingPointsByRank?.[optionIndex];
  if (v == null || !Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(10_000, Math.trunc(v)));
}

/** Приводит массив баллов к числу тегов (дозаполняет единицами). */
export function normalizeTagCloudQuestionPoints(q: QuestionForm): QuestionForm {
  if (q.type !== "tag_cloud" || !isEditorQuizMode(q)) return q;
  const n = q.options.length;
  return {
    ...q,
    options: q.options.map((o) => (o.text.trim() ? { ...o, isCorrect: true } : o)),
    rankingPointsByRank: Array.from({ length: n }, (_, i) => tagCloudPointsForOption(q, i)),
  };
}

function tagCloudRankingPointsForSave(q: QuestionForm): number[] {
  return q.options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.text.trim())
    .map(({ i }) => tagCloudPointsForOption(q, i));
}

function projectMetricFromApi(raw: unknown): "avg_rank" | "avg_score" | "total_score" {
  if (raw === "AVG_SCORE") return "avg_score";
  if (raw === "TOTAL_SCORE") return "total_score";
  return "avg_score";
}

function rankingKindFromApi(raw: unknown): "quiz" | "jury" {
  return raw === "JURY" ? "jury" : "quiz";
}

function defaultRankingPlayerHint(kind: "quiz" | "jury"): string {
  return kind === "quiz"
    ? "Расставьте варианты от лучшего к худшему (первый в списке — лучший)."
    : "Расставьте варианты от лучшего к худшему. Баллы по позициям задаёт ведущий; зачёт в общей таблице не меняется.";
}

/**
 * Голосования комнаты (subQuizId=null) на сервере всегда scoringMode poll,
 * но в редакторе «один/несколько правильных» задаются через isCorrect на вариантах.
 */
export function editorQuizModeFromLoadedQuestion(
  q: Pick<AdminEventRoomQuestion, "type" | "scoringMode" | "options">,
  subQuizId: string | null,
): boolean {
  if (subQuizId != null) {
    return q.scoringMode === undefined || q.scoringMode === "QUIZ";
  }
  if (q.type === "SINGLE" || q.type === "MULTI") {
    return q.options.some((o) => o.isCorrect);
  }
  if (q.type === "TEMPERATURE") return false;
  return q.scoringMode === undefined || q.scoringMode === "QUIZ";
}

export type RoomContentPayload = {
  subQuizzes: Array<{
    id?: string;
    title: string;
    questionFlowMode?: "manual" | "auto";
    sortOrder: number;
    questions: ReturnType<typeof toQuestionReplaceInput>[];
  }>;
  standaloneQuestions: ReturnType<typeof toQuestionReplaceInput>[];
};

export function questionAllowsQuestionImage(q: QuestionForm): boolean {
  return Boolean(q.useImages);
}

export function questionAllowsOptionImages(q: QuestionForm): boolean {
  return Boolean(q.useImages) && q.type !== "tag_cloud";
}

export function getQuestionTypeSelectValue(
  question: QuestionForm,
): "single" | "multi" | "ranking" | "tag_cloud" | "poll" | "temperature" {
  if (question.type === "temperature") return "temperature";
  if (
    (question.subQuizId == null || question.subQuizId === undefined) &&
    (question.type === "single" || question.type === "multi") &&
    !isEditorQuizMode(question)
  ) {
    return "poll";
  }
  return question.type;
}

/** Копия вопроса/голосования для вставки в комнату (без id, без ответов, неактивна). */
export function cloneQuestionForm(source: QuestionForm): QuestionForm {
  const cloned = JSON.parse(JSON.stringify(source)) as QuestionForm;
  delete cloned.id;
  cloned.isActive = false;
  cloned.adminDone = false;
  return cloned;
}

export function createEmptyQuestion(subQuizId: string | null = null): QuestionForm {
  return {
    subQuizId,
    text: "",
    useImages: false,
    type: "single",
    editorQuizMode: true,
    points: 1,
    maxAnswers: 3,
    showVoteCount: false,
    showCorrectOption: false,
    showQuestionTitle: true,
    hiddenTagTexts: [],
    injectedTagWords: [],
    tagCountOverrides: [],
    optionVoteCountOverrides: [],
    injectedTagsInput: "",
    options: [
      /** Первый вариант по умолчанию правильный (подквиз и голосования комнаты — для подсказки/первых верных без баллов в опросе). */
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

function coerceQuestionPoints(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10_000, Math.trunc(n)));
}

function coerceMaxAnswers(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(1, Math.min(5, Math.trunc(n)));
}

export function toQuestionReplaceInput(q: QuestionForm) {
  const scoringMode: "poll" | "quiz" =
    q.type === "temperature"
      ? "poll"
      : q.type === "ranking" && q.rankingKind === "jury"
        ? "poll"
        : q.type === "ranking" && q.rankingKind === "quiz"
          ? "quiz"
          : q.subQuizId == null || q.subQuizId === undefined
            ? "poll"
            : isEditorQuizMode(q)
              ? "quiz"
              : "poll";
  const options =
    q.type === "tag_cloud" && !isEditorQuizMode(q)
      ? []
      : q.type === "tag_cloud" && isEditorQuizMode(q)
        ? q.options
            .filter((o) => o.text.trim())
            .map((o) => ({ text: o.text.trim(), isCorrect: true }))
        : q.type === "ranking"
          ? q.options.map((o) =>
              normalizeOptionForSave({ ...o, text: o.text.trim() }, questionAllowsOptionImages(q)),
            )
          : q.options.map((o) => normalizeOptionForSave(o, questionAllowsOptionImages(q)));
  return {
    id: q.id,
    text: q.text.trim(),
    imageUrl: questionAllowsQuestionImage(q) ? q.imageUrl?.trim() || undefined : undefined,
    type: q.type,
    points: coerceQuestionPoints(q.points),
    maxAnswers: coerceMaxAnswers(q.maxAnswers),
    scoringMode,
    projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
    projectorFirstCorrectWinnersCount: Math.max(
      1,
      Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
    ),
    adminDone: q.adminDone ?? false,
    ...(q.type === "ranking"
      ? {
          rankingPointsByRank:
            q.rankingPointsByRank != null && q.rankingPointsByRank.length === q.options.length
              ? q.rankingPointsByRank
              : null,
          rankingProjectorMetric: q.rankingProjectorMetric ?? "avg_score",
          rankingKind: q.rankingKind ?? "jury",
          rankingPlayerHint: q.rankingPlayerHint?.trim() || null,
        }
      : q.type === "temperature"
        ? {
            temperatureSubtitle: q.temperatureSubtitle?.trim() || null,
          }
        : q.type === "tag_cloud" && isEditorQuizMode(q)
          ? {
              rankingPointsByRank: tagCloudRankingPointsForSave(q),
            }
          : {}),
    options,
  };
}

export function buildRoomContentPayload(
  sheets: SubQuizSheet[],
  questionForms: QuestionForm[],
): RoomContentPayload {
  const subQuizzes = sheets.map((sq, sortOrder) => ({
    id: sq.id,
    title: sq.title.trim() || "Квиз",
    questionFlowMode: sq.questionFlowMode ?? "manual",
    sortOrder,
    questions: questionForms.filter((q) => q.subQuizId === sq.id).map(toQuestionReplaceInput),
  }));
  const standaloneQuestions = questionForms
    .filter((q) => q.subQuizId === null)
    .map(toQuestionReplaceInput);
  return { subQuizzes, standaloneQuestions };
}

export function serializeRoomContent(sheets: SubQuizSheet[], questionForms: QuestionForm[]) {
  return JSON.stringify(buildRoomContentPayload(sheets, questionForms));
}

/** Упорядоченный плоский список: квизы по sortOrder, затем голосования комнаты */
export function flattenQuestionsFromRoom(
  data: Pick<AdminEventRoom, "subQuizzes" | "questions">,
  cloudManual: CloudManualStateByQuestion,
): QuestionForm[] {
  const subs = [...data.subQuizzes].sort((a, b) => a.sortOrder - b.sortOrder);
  const out: QuestionForm[] = [];
  for (const sq of subs) {
    const qs = data.questions
      .filter((q) => q.subQuizId === sq.id)
      .sort((a, b) => a.order - b.order);
    out.push(...mapLoadedRoomQuestions(qs, cloudManual, sq.id));
  }
  const stand = data.questions.filter((q) => !q.subQuizId).sort((a, b) => a.order - b.order);
  out.push(...mapLoadedRoomQuestions(stand, cloudManual, null));
  return out;
}

/** Показывать блок правильности / баллы для квиза (не выводить из факта «все варианты неверные»). */
export function isEditorQuizMode(question: QuestionForm): boolean {
  if (!question.editorQuizMode) return false;
  if (question.type === "tag_cloud") {
    return question.subQuizId != null;
  }
  return true;
}

function questionLabelForValidation(q: QuestionForm, index: number): string {
  const t = q.text.trim();
  if (t) {
    const short = t.length > 48 ? `${t.slice(0, 48)}…` : t;
    return `«${short}»`;
  }
  if (q.imageUrl?.trim()) {
    return `№${index + 1} (с картинкой)`;
  }
  return `№${index + 1} (без текста)`;
}

function optionHasContent(option: OptionForm): boolean {
  return optionHasTextOrImage(option.text, option.imageUrl);
}

function normalizeOptionForSave(option: OptionForm, includeImages: boolean): OptionForm {
  return {
    text: option.text,
    isCorrect: option.isCorrect,
    imageUrl: includeImages ? option.imageUrl?.trim() || undefined : undefined,
    ...(option.weight != null ? { weight: option.weight } : {}),
  };
}

/** Валидация одного вопроса (те же правила, что и при полной проверке списка). */
export function validateQuestionFormEntry(q: QuestionForm, index: number): string | null {
  const label = questionLabelForValidation(q, index);

  if (q.useImages) {
    if (!q.text.trim() && !q.imageUrl?.trim()) {
      return `У вопроса ${label} укажите текст или картинку.`;
    }
  } else if (!q.text.trim()) {
    return `У вопроса ${label} укажите текст.`;
  }

  if (q.type === "tag_cloud") {
    const max = Number(q.maxAnswers);
    if (!Number.isFinite(max) || max < 1 || max > 5) {
      return `Вопрос ${label}: для облака тегов укажите «макс. ответов» от 1 до 5.`;
    }
    if (isEditorQuizMode(q)) {
      const referenceTags = q.options.filter((o) => o.text.trim());
      if (referenceTags.length < 1) {
        return `Вопрос ${label}: добавьте хотя бы один эталонный тег.`;
      }
    }
    return null;
  }

  if (q.type === "ranking") {
    if (q.options.length < 3) {
      return `Вопрос ${label}: для ранжирования нужно не меньше трёх вариантов.`;
    }
    if (q.options.some((o) => !(q.useImages ? optionHasContent(o) : o.text.trim()))) {
      return q.useImages
        ? `Вопрос ${label}: у каждого варианта должен быть текст или картинка.`
        : `Вопрос ${label}: у каждого варианта должен быть текст.`;
    }
    if (q.rankingPointsByRank != null && q.rankingPointsByRank.length !== q.options.length) {
      return `Вопрос ${label}: задайте балл для каждой позиции или очистите поля «только полный ответ».`;
    }
    if (q.rankingKind === "jury") {
      if (q.rankingPointsByRank == null || q.rankingPointsByRank.length !== q.options.length) {
        return `Вопрос ${label}: в режиме жюри нужна полная таблица баллов по позициям.`;
      }
    }
    return null;
  }

  if (q.type === "temperature") {
    if (q.options.length < 2) {
      return `Вопрос ${label}: для измерения температуры нужно минимум 2 варианта.`;
    }
    if (q.options.some((o) => !(q.useImages ? optionHasContent(o) : o.text.trim()))) {
      return q.useImages
        ? `Вопрос ${label}: у каждого варианта должен быть текст или картинка.`
        : `Вопрос ${label}: у каждого варианта должен быть текст.`;
    }
    for (let i = 0; i < q.options.length; i += 1) {
      const w = q.options[i]!.weight;
      if (w == null || !Number.isFinite(w) || w < 0 || w > 100) {
        return `Вопрос ${label}: у варианта ${i + 1} задайте вес от 0 до 100.`;
      }
    }
    return null;
  }

  if (q.options.length < 2) {
    return `Вопрос ${label}: нужно минимум 2 варианта ответа.`;
  }
  if (q.options.some((o) => !(q.useImages ? optionHasContent(o) : o.text.trim()))) {
    return q.useImages
      ? `Вопрос ${label}: у каждого варианта должен быть текст или картинка.`
      : `Вопрос ${label}: у каждого варианта должен быть текст.`;
  }

  if (!isEditorQuizMode(q)) {
    return null;
  }

  const correctCount = q.options.reduce((n, o) => n + (o.isCorrect ? 1 : 0), 0);

  if (correctCount < 1) {
    return `Вопрос ${label}: отметьте хотя бы один правильный вариант (для подсказки на экране и списка первых верно ответивших).`;
  }
  if (q.type === "single" && correctCount !== 1) {
    return `Вопрос ${label}: при типе «один правильный» отметьте ровно один вариант (сейчас отмечено: ${correctCount}).`;
  }
  return null;
}

/** Сообщение об ошибке или null, если валидно. */
export function validateQuestionsForm(questions: QuestionForm[]): string | null {
  for (let i = 0; i < questions.length; i++) {
    const err = validateQuestionFormEntry(questions[i], i);
    if (err) return err;
  }
  return null;
}

export function validateSheetsHaveSubQuizId(
  sheets: SubQuizSheet[],
  questions: QuestionForm[],
): string | null {
  for (const q of questions) {
    if (q.subQuizId === null) continue;
    if (!sheets.some((s) => s.id === q.subQuizId)) {
      return "Вопрос привязан к удалённому квизу. Сохраните структуру квизов заново.";
    }
  }
  return null;
}

export function buildQuestionIndexMapForSubQuiz(
  questionForms: QuestionForm[],
  subQuizId: string | null,
): number[] {
  const m: number[] = [];
  questionForms.forEach((q, i) => {
    if (subQuizId === null) {
      if (q.subQuizId === null || q.subQuizId === undefined) m.push(i);
    } else if (q.subQuizId === subQuizId) {
      m.push(i);
    }
  });
  return m;
}

/** Первый квиз с черновиком или без вопросов; если все заполнены — первый квиз. */
export function computeFirstIncompleteSubQuizId(
  sheets: SubQuizSheet[],
  forms: QuestionForm[],
): string | false {
  if (sheets.length === 0) return false;
  for (const sq of sheets) {
    const indices: number[] = [];
    forms.forEach((q, i) => {
      if (q.subQuizId === sq.id) indices.push(i);
    });
    if (indices.length === 0) return sq.id;
    for (const gi of indices) {
      if (validateQuestionFormEntry(forms[gi], gi)) return sq.id;
    }
  }
  return sheets[0].id;
}

export function mapLoadedRoomQuestions(
  questions: AdminEventRoomQuestion[],
  cloudManual: CloudManualStateByQuestion,
  subQuizId: string | null,
): QuestionForm[] {
  return questions.map((q) => {
    const kind = rankingKindFromApi(q.rankingKind);
    const options = normalizeSingleCorrectFlags(
      q.type,
      q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
        imageUrl: o.imageUrl?.trim() || undefined,
        ...(o.weight != null ? { weight: o.weight } : {}),
      })),
    );
    const form: QuestionForm = {
      id: q.id,
      subQuizId,
      text: q.text,
      imageUrl: q.imageUrl?.trim() || undefined,
      useImages: inferQuestionUseImages({ imageUrl: q.imageUrl ?? undefined, options }),
      type: prismaQuestionTypeToFormType(q.type),
      editorQuizMode: editorQuizModeFromLoadedQuestion(q, subQuizId),
      points: coerceQuestionPoints(q.points),
      maxAnswers: coerceMaxAnswers(q.maxAnswers) ?? 3,
      isActive: q.isActive,
      adminDone: Boolean(q.adminDone),
      showVoteCount: false,
      showQuestionTitle: true,
      projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
      projectorFirstCorrectWinnersCount: Math.max(
        1,
        Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
      ),
      hiddenTagTexts: cloudManual[q.id]?.hiddenTagTexts ?? [],
      injectedTagWords: cloudManual[q.id]?.injectedTagWords ?? [],
      tagCountOverrides: cloudManual[q.id]?.tagCountOverrides ?? [],
      optionVoteCountOverrides: cloudManual[q.id]?.optionVoteCountOverrides ?? [],
      injectedTagsInput: "",
      rankingPointsByRank: parseRankingPointsFromApi(q.rankingPointsByRank),
      rankingProjectorMetric: projectMetricFromApi(q.rankingProjectorMetric),
      rankingKind: kind,
      rankingPlayerHint:
        q.type === "RANKING" ? q.rankingPlayerHint?.trim() || defaultRankingPlayerHint(kind) : "",
      temperatureSubtitle: q.type === "TEMPERATURE" ? q.temperatureSubtitle?.trim() || "" : "",
      options,
    };
    return form.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(form) : form;
  });
}

export function mergeServerQuestionsIntoForms(
  serverQuestions: AdminEventRoomQuestion[],
  mergeFrom: QuestionForm[],
  subQuizId: string | null,
): QuestionForm[] {
  return serverQuestions.map((q) => {
    const kind = rankingKindFromApi(q.rankingKind);
    const options = normalizeSingleCorrectFlags(
      q.type,
      q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
        imageUrl: o.imageUrl?.trim() || undefined,
        ...(o.weight != null ? { weight: o.weight } : {}),
      })),
    );
    const prev = mergeFrom.find((item) => item.id === q.id);
    const form: QuestionForm = {
      id: q.id,
      subQuizId,
      text: q.text,
      imageUrl: q.imageUrl?.trim() || undefined,
      useImages:
        prev?.useImages ?? inferQuestionUseImages({ imageUrl: q.imageUrl ?? undefined, options }),
      type: prismaQuestionTypeToFormType(q.type),
      editorQuizMode: editorQuizModeFromLoadedQuestion(q, subQuizId),
      points: coerceQuestionPoints(q.points),
      maxAnswers: coerceMaxAnswers(q.maxAnswers) ?? 3,
      isActive: q.isActive,
      adminDone: Boolean(q.adminDone),
      showVoteCount: prev?.showVoteCount ?? false,
      showQuestionTitle: prev?.showQuestionTitle ?? true,
      projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
      projectorFirstCorrectWinnersCount: Math.max(
        1,
        Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
      ),
      hiddenTagTexts: prev?.hiddenTagTexts ?? [],
      injectedTagWords: prev?.injectedTagWords ?? [],
      tagCountOverrides: prev?.tagCountOverrides ?? [],
      optionVoteCountOverrides: prev?.optionVoteCountOverrides ?? [],
      injectedTagsInput: "",
      rankingPointsByRank: parseRankingPointsFromApi(q.rankingPointsByRank),
      rankingProjectorMetric: projectMetricFromApi(q.rankingProjectorMetric),
      rankingKind: kind,
      rankingPlayerHint:
        q.type === "RANKING" ? q.rankingPlayerHint?.trim() || defaultRankingPlayerHint(kind) : "",
      temperatureSubtitle:
        prev?.temperatureSubtitle ??
        (q.type === "TEMPERATURE" ? q.temperatureSubtitle?.trim() || "" : ""),
      options,
    };
    return form.type === "tag_cloud" ? normalizeTagCloudQuestionPoints(form) : form;
  });
}

/** После PUT: восстановить порядок и локальные поля из предыдущего снимка */
export function mergeRoomReloadIntoState(
  data: AdminEventRoom,
  mergeFrom: { sheets: SubQuizSheet[]; questions: QuestionForm[] },
  cloudManual: CloudManualStateByQuestion,
): { sheets: SubQuizSheet[]; questions: QuestionForm[] } {
  const sheets: SubQuizSheet[] = data.subQuizzes.map((s) => ({
    id: s.id,
    title: s.title,
    questionFlowMode: s.questionFlowMode === "AUTO" ? "auto" : "manual",
  }));
  const prevById = new Map(mergeFrom.questions.filter((q) => q.id).map((q) => [q.id!, q]));
  const rebuilt = flattenQuestionsFromRoom(data, cloudManual).map((q) => {
    const prev = q.id ? prevById.get(q.id) : undefined;
    if (!prev) return q;
    return {
      ...q,
      useImages: prev.useImages ?? q.useImages,
      showVoteCount: prev.showVoteCount ?? false,
      showQuestionTitle: prev.showQuestionTitle ?? true,
      hiddenTagTexts: prev.hiddenTagTexts ?? [],
      injectedTagWords: prev.injectedTagWords ?? [],
      tagCountOverrides: prev.tagCountOverrides ?? [],
      optionVoteCountOverrides: prev.optionVoteCountOverrides ?? [],
    };
  });
  return { sheets, questions: rebuilt };
}
