import type { CloudManualStateByQuestion, CloudWordCount, PublicViewPayload } from "../publicViewContract";

/** Голосования комнаты: вопросы с subQuizId === null не привязаны к квизу. */

export type QuestionType = "single" | "multi" | "tag_cloud";

export type OptionForm = {
  text: string;
  isCorrect: boolean;
};

export type QuestionForm = {
  id?: string;
  /** Привязка к квизу комнаты; null — отдельное голосование */
  subQuizId?: string | null;
  text: string;
  type: QuestionType;
  /** Режим квиза в редакторе: правильные ответы и баллы (для голосований комнаты — по желанию, переключатель в диалоге). */
  editorQuizMode: boolean;
  points: number;
  maxAnswers: number;
  isActive?: boolean;
  showVoteCount?: boolean;
  showQuestionTitle?: boolean;
  /** Голосование комнаты: показывать победителей на проекторе (вместе с переключателем в «Результаты»). */
  projectorShowFirstCorrect?: boolean;
  /** Сколько первых верно ответивших выводить на проекторе (1–20). */
  projectorFirstCorrectWinnersCount?: number;
  hiddenTagTexts?: string[];
  injectedTagWords?: CloudWordCount[];
  tagCountOverrides?: CloudWordCount[];
  injectedTagsInput?: string;
  options: OptionForm[];
};

export type AdminEventRoomQuestion = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTI" | "TAG_CLOUD";
  points: number;
  maxAnswers: number;
  isActive: boolean;
  order: number;
  subQuizId?: string | null;
  scoringMode?: "POLL" | "QUIZ";
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
};

export type AdminEventSubQuiz = {
  id: string;
  title: string;
  sortOrder: number;
  currentQuestionIndex: number;
};

/** Для SINGLE на сервере не должно быть >1 правильного; иначе валидатор и UI расходятся. */
function normalizeSingleCorrectFlags<T extends { isCorrect: boolean }>(
  questionType: AdminEventRoomQuestion["type"],
  options: T[],
): T[] {
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

export type SubQuizSheet = { id: string; title: string };

export type RoomContentPayload = {
  subQuizzes: Array<{
    title: string;
    sortOrder: number;
    questions: ReturnType<typeof toQuestionReplaceInput>[];
  }>;
  standaloneQuestions: ReturnType<typeof toQuestionReplaceInput>[];
};

export function createEmptyQuestion(subQuizId: string | null = null): QuestionForm {
  return {
    subQuizId,
    text: "",
    type: "single",
    editorQuizMode: true,
    points: 1,
    maxAnswers: 3,
    showVoteCount: true,
    showQuestionTitle: true,
    hiddenTagTexts: [],
    injectedTagWords: [],
    tagCountOverrides: [],
    injectedTagsInput: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

export function toQuestionReplaceInput(q: QuestionForm) {
  const scoringMode: "poll" | "quiz" =
    q.type === "tag_cloud"
      ? "poll"
      : q.subQuizId == null || q.subQuizId === undefined
        ? "poll"
        : isEditorQuizMode(q)
          ? "quiz"
          : "poll";
  return {
    text: q.text,
    type: q.type,
    points: q.points,
    maxAnswers: q.maxAnswers,
    scoringMode,
    projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
    projectorFirstCorrectWinnersCount: Math.max(
      1,
      Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
    ),
    options: q.type === "tag_cloud" ? [] : q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  };
}

export function buildRoomContentPayload(sheets: SubQuizSheet[], questionForms: QuestionForm[]): RoomContentPayload {
  const subQuizzes = sheets.map((sq, sortOrder) => ({
    title: sq.title.trim() || "Квиз",
    sortOrder,
    questions: questionForms.filter((q) => q.subQuizId === sq.id).map(toQuestionReplaceInput),
  }));
  const standaloneQuestions = questionForms.filter((q) => q.subQuizId === null).map(toQuestionReplaceInput);
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
  const stand = data.questions
    .filter((q) => !q.subQuizId)
    .sort((a, b) => a.order - b.order);
  out.push(...mapLoadedRoomQuestions(stand, cloudManual, null));
  return out;
}

/** Показывать блок правильности / баллы для квиза (не выводить из факта «все варианты неверные»). */
export function isEditorQuizMode(question: QuestionForm): boolean {
  return question.type !== "tag_cloud" && question.editorQuizMode;
}

function questionLabelForValidation(q: QuestionForm, index: number): string {
  const t = q.text.trim();
  if (t) {
    const short = t.length > 48 ? `${t.slice(0, 48)}…` : t;
    return `«${short}»`;
  }
  return `№${index + 1} (без текста)`;
}

/** Валидация одного вопроса (те же правила, что и при полной проверке списка). */
export function validateQuestionFormEntry(q: QuestionForm, index: number): string | null {
  const label = questionLabelForValidation(q, index);

  if (!q.text.trim()) {
    return `Заполните текст вопроса ${label}.`;
  }

  if (q.type === "tag_cloud") {
    const max = Number(q.maxAnswers);
    if (!Number.isFinite(max) || max < 1 || max > 5) {
      return `Вопрос ${label}: для облака тегов укажите «макс. ответов» от 1 до 5.`;
    }
    return null;
  }

  if (q.options.length < 2) {
    return `Вопрос ${label}: нужно минимум 2 варианта ответа.`;
  }
  if (q.options.some((o) => !o.text.trim())) {
    return `Вопрос ${label}: у каждого варианта должен быть непустой текст.`;
  }

  if (!isEditorQuizMode(q)) {
    return null;
  }

  const correctCount = q.options.reduce((n, o) => n + (o.isCorrect ? 1 : 0), 0);

  if (correctCount < 1) {
    return `Вопрос ${label}: в режиме квиза отметьте хотя бы один правильный вариант.`;
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

export function validateSheetsHaveSubQuizId(sheets: SubQuizSheet[], questions: QuestionForm[]): string | null {
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
  return questions.map((q) => ({
    id: q.id,
    subQuizId,
    text: q.text,
    type: q.type === "SINGLE" ? "single" : q.type === "MULTI" ? "multi" : "tag_cloud",
    editorQuizMode:
      q.type !== "TAG_CLOUD" &&
      ((subQuizId != null && (q.scoringMode === undefined || q.scoringMode === "QUIZ")) ||
        (subQuizId == null && q.options.some((o) => o.isCorrect))),
    points: q.points,
    maxAnswers: q.maxAnswers ?? 3,
    isActive: q.isActive,
    showVoteCount: true,
    showQuestionTitle: true,
    projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
    projectorFirstCorrectWinnersCount: Math.max(
      1,
      Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
    ),
    hiddenTagTexts: cloudManual[q.id]?.hiddenTagTexts ?? [],
    injectedTagWords: cloudManual[q.id]?.injectedTagWords ?? [],
    tagCountOverrides: cloudManual[q.id]?.tagCountOverrides ?? [],
    injectedTagsInput: "",
    options: normalizeSingleCorrectFlags(
      q.type,
      q.options.map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) })),
    ),
  }));
}

export function mergeServerQuestionsIntoForms(
  serverQuestions: AdminEventRoomQuestion[],
  mergeFrom: QuestionForm[],
  subQuizId: string | null,
): QuestionForm[] {
  return serverQuestions.map((q) => ({
    id: q.id,
    subQuizId,
    text: q.text,
    type: q.type === "SINGLE" ? "single" : q.type === "MULTI" ? "multi" : "tag_cloud",
    editorQuizMode:
      q.type !== "TAG_CLOUD" &&
      ((subQuizId != null && (q.scoringMode === undefined || q.scoringMode === "QUIZ")) ||
        (subQuizId == null && q.options.some((o) => o.isCorrect))),
    points: q.points,
    maxAnswers: q.maxAnswers ?? 3,
    isActive: q.isActive,
    showVoteCount: mergeFrom.find((item) => item.id === q.id)?.showVoteCount ?? true,
    showQuestionTitle: mergeFrom.find((item) => item.id === q.id)?.showQuestionTitle ?? true,
    projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
    projectorFirstCorrectWinnersCount: Math.max(
      1,
      Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
    ),
    hiddenTagTexts: mergeFrom.find((item) => item.id === q.id)?.hiddenTagTexts ?? [],
    injectedTagWords: mergeFrom.find((item) => item.id === q.id)?.injectedTagWords ?? [],
    tagCountOverrides: mergeFrom.find((item) => item.id === q.id)?.tagCountOverrides ?? [],
    injectedTagsInput: "",
    options: normalizeSingleCorrectFlags(
      q.type,
      q.options.map((o) => ({ text: o.text, isCorrect: Boolean(o.isCorrect) })),
    ),
  }));
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
  }));
  const prevById = new Map(mergeFrom.questions.filter((q) => q.id).map((q) => [q.id!, q]));
  const rebuilt = flattenQuestionsFromRoom(data, cloudManual).map((q) => {
    const prev = q.id ? prevById.get(q.id) : undefined;
    if (!prev) return q;
    return {
      ...q,
      showVoteCount: prev.showVoteCount ?? true,
      showQuestionTitle: prev.showQuestionTitle ?? true,
      hiddenTagTexts: prev.hiddenTagTexts ?? [],
      injectedTagWords: prev.injectedTagWords ?? [],
      tagCountOverrides: prev.tagCountOverrides ?? [],
    };
  });
  return { sheets, questions: rebuilt };
}
