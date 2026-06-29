import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export const FEEDBACK_SCALE_MIN_OPTIONS = 2;
export const FEEDBACK_SCALE_MAX_OPTIONS = 10;
export const FEEDBACK_OPEN_FIELD_MAX = 10;

export type FeedbackScale = {
  id: string;
  label: string;
  options: string[];
};

export type FeedbackOpenField = {
  id: string;
  label: string;
  placeholder: string;
};

export type FeedbackFormConfig = {
  id: string;
  quizId: string;
  title: string;
  isActive: boolean;
  isClosed: boolean;
  scales: FeedbackScale[];
  openFields: FeedbackOpenField[];
  commentEnabled: boolean;
  commentPlaceholder: string;
};

export type ActiveFeedbackFormPublic = {
  id: string;
  title: string;
  scales: FeedbackScale[];
  openFields: FeedbackOpenField[];
  commentEnabled: boolean;
  commentPlaceholder: string;
  isClosed: boolean;
  activatedAt: string | null;
};

export type FeedbackFormInput = {
  title: string;
  scales: FeedbackScale[];
  openFields?: FeedbackOpenField[];
  commentEnabled?: boolean;
  commentPlaceholder?: string;
};

export function defaultFeedbackScales(): FeedbackScale[] {
  return [
    {
      id: randomUUID(),
      label: "Как вам мероприятие?",
      options: ["😞", "😐", "🙂", "😊", "🤩"],
    },
    {
      id: randomUUID(),
      label: "Насколько полезен контент?",
      options: ["1", "2", "3", "4", "5"],
    },
  ];
}

export function parseFeedbackScales(json: unknown): FeedbackScale[] {
  if (!Array.isArray(json)) return [];
  const scales: FeedbackScale[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; label?: unknown; options?: unknown };
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    if (typeof row.label !== "string" || !row.label.trim()) continue;
    if (
      !Array.isArray(row.options) ||
      row.options.length < FEEDBACK_SCALE_MIN_OPTIONS ||
      row.options.length > FEEDBACK_SCALE_MAX_OPTIONS
    ) {
      continue;
    }
    const options = row.options.map((o) => (typeof o === "string" ? o.trim() : ""));
    if (options.some((o) => !o)) continue;
    scales.push({
      id: row.id.trim().slice(0, 80),
      label: row.label.trim().slice(0, 200),
      options: options as FeedbackScale["options"],
    });
  }
  return scales;
}

export function parseFeedbackOpenFields(
  json: unknown,
  commentEnabled: boolean,
  commentPlaceholder: string,
): FeedbackOpenField[] {
  const fields: FeedbackOpenField[] = [];
  if (Array.isArray(json)) {
    for (const item of json) {
      if (!item || typeof item !== "object") continue;
      const row = item as { id?: unknown; label?: unknown; placeholder?: unknown };
      if (typeof row.id !== "string" || !row.id.trim()) continue;
      if (typeof row.label !== "string" || !row.label.trim()) continue;
      const placeholder = typeof row.placeholder === "string" ? row.placeholder.trim() : "";
      fields.push({
        id: row.id.trim().slice(0, 80),
        label: row.label.trim().slice(0, 200),
        placeholder: placeholder.slice(0, 300),
      });
    }
  }
  if (fields.length > 0) return fields.slice(0, FEEDBACK_OPEN_FIELD_MAX);
  if (commentEnabled) {
    return [
      {
        id: randomUUID(),
        label: "Комментарий",
        placeholder: (commentPlaceholder ?? "").trim().slice(0, 300),
      },
    ];
  }
  return [];
}

function parseOpenFieldAnswers(json: unknown): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    out[key] = trimmed.slice(0, 2000);
  }
  return out;
}

function normalizeResponseOpenFieldAnswers(
  openFieldAnswers: Record<string, string>,
  comment: string | null,
  openFields: FeedbackOpenField[],
): Record<string, string> {
  const normalized = { ...openFieldAnswers };
  if (comment && comment.trim().length > 0) {
    const legacyFieldId = openFields[0]?.id;
    if (legacyFieldId && !normalized[legacyFieldId]) {
      normalized[legacyFieldId] = comment.trim();
    }
  }
  return normalized;
}

function resolveFeedbackOpenFields(input: FeedbackFormInput): FeedbackOpenField[] {
  if (input.openFields) {
    return parseFeedbackOpenFields(input.openFields, false, "");
  }
  return parseFeedbackOpenFields([], input.commentEnabled ?? false, input.commentPlaceholder ?? "");
}

function legacyCommentFieldsFromOpenFields(openFields: FeedbackOpenField[]): {
  commentEnabled: boolean;
  commentPlaceholder: string;
} {
  return {
    commentEnabled: openFields.length > 0,
    commentPlaceholder: openFields[0]?.placeholder ?? "",
  };
}

function mapFormRow(form: {
  id: string;
  quizId: string;
  title: string;
  isActive: boolean;
  isClosed: boolean;
  scales: unknown;
  openFields?: unknown;
  commentEnabled: boolean;
  commentPlaceholder: string;
}): FeedbackFormConfig {
  const scales = parseFeedbackScales(form.scales);
  const openFields = parseFeedbackOpenFields(
    form.openFields,
    form.commentEnabled,
    form.commentPlaceholder,
  );
  const legacy = legacyCommentFieldsFromOpenFields(openFields);
  return {
    id: form.id,
    quizId: form.quizId,
    title: form.title,
    isActive: form.isActive,
    isClosed: form.isClosed,
    scales: scales.length > 0 ? scales : defaultFeedbackScales(),
    openFields,
    commentEnabled: legacy.commentEnabled,
    commentPlaceholder: legacy.commentPlaceholder,
  };
}

export async function listFeedbackFormsByQuizId(quizId: string): Promise<FeedbackFormConfig[]> {
  const forms = await prisma.feedbackForm.findMany({
    where: { quizId },
    orderBy: { createdAt: "asc" },
  });
  return forms.map(mapFormRow);
}

export async function getFeedbackFormById(formId: string): Promise<FeedbackFormConfig | null> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form) return null;
  return mapFormRow(form);
}

export async function createFeedbackForm(
  quizId: string,
  input: FeedbackFormInput,
): Promise<FeedbackFormConfig> {
  const openFields = resolveFeedbackOpenFields(input);
  const legacy = legacyCommentFieldsFromOpenFields(openFields);
  const form = await prisma.feedbackForm.create({
    data: {
      quizId,
      title: input.title.trim().slice(0, 200),
      scales: input.scales as unknown as Prisma.InputJsonValue,
      openFields: openFields as unknown as Prisma.InputJsonValue,
      commentEnabled: legacy.commentEnabled,
      commentPlaceholder: legacy.commentPlaceholder,
    },
  });
  return mapFormRow(form);
}

export async function updateFeedbackFormConfig(
  formId: string,
  input: FeedbackFormInput,
): Promise<FeedbackFormConfig> {
  const existing = await getFeedbackFormById(formId);
  if (!existing) {
    throw new Error("Форма обратной связи не найдена");
  }
  if (existing.isActive && !existing.isClosed) {
    throw new Error("Нельзя редактировать форму, пока идёт сбор ответов");
  }
  const openFields = resolveFeedbackOpenFields(input);
  const legacy = legacyCommentFieldsFromOpenFields(openFields);
  const form = await prisma.feedbackForm.update({
    where: { id: formId },
    data: {
      title: input.title.trim().slice(0, 200),
      scales: input.scales as unknown as Prisma.InputJsonValue,
      openFields: openFields as unknown as Prisma.InputJsonValue,
      commentEnabled: legacy.commentEnabled,
      commentPlaceholder: legacy.commentPlaceholder,
    },
  });
  return mapFormRow(form);
}

export function mapActiveFeedbackFormPublic(
  form: FeedbackFormConfig | null,
  activatedAt: Date | null = null,
): ActiveFeedbackFormPublic | null {
  if (!form || !form.isActive || form.isClosed) return null;
  return {
    id: form.id,
    title: form.title,
    scales: form.scales,
    openFields: form.openFields,
    commentEnabled: form.commentEnabled,
    commentPlaceholder: form.commentPlaceholder,
    isClosed: form.isClosed,
    activatedAt: activatedAt?.toISOString() ?? null,
  };
}

export async function getActiveFeedbackFormPublic(
  quizId: string,
): Promise<ActiveFeedbackFormPublic | null> {
  const form = await prisma.feedbackForm.findFirst({
    where: { quizId, isActive: true, isClosed: false },
  });
  if (!form) return null;
  return mapActiveFeedbackFormPublic(mapFormRow(form), form.activatedAt);
}

export async function activateFeedbackForm(formId: string): Promise<string> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Форма обратной связи не найдена");
  await prisma.$transaction([
    prisma.feedbackForm.updateMany({
      where: { quizId: form.quizId, id: { not: formId } },
      data: { isActive: false, isClosed: true },
    }),
    prisma.feedbackForm.update({
      where: { id: formId },
      data: { isActive: true, isClosed: false, activatedAt: new Date() },
    }),
  ]);
  return form.quizId;
}

export async function closeFeedbackForm(formId: string): Promise<string | null> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form) return null;
  await prisma.feedbackForm.update({
    where: { id: formId },
    data: { isActive: false, isClosed: true },
  });
  return form.quizId;
}

async function getActiveFeedbackFormConfig(quizId: string): Promise<FeedbackFormConfig | null> {
  const form = await prisma.feedbackForm.findFirst({
    where: { quizId, isActive: true, isClosed: false },
  });
  if (!form) return null;
  return mapFormRow(form);
}

export async function hasParticipantSubmittedFeedbackForForm(
  formId: string,
  participantId: string,
): Promise<boolean> {
  const hit = await prisma.feedbackResponse.findUnique({
    where: {
      feedbackFormId_participantId: {
        feedbackFormId: formId,
        participantId,
      },
    },
    select: { id: true },
  });
  return !!hit;
}

export async function getFeedbackSubmittedParticipantIds(formId: string): Promise<Set<string>> {
  const rows = await prisma.feedbackResponse.findMany({
    where: { feedbackFormId: formId },
    select: { participantId: true },
  });
  return new Set(rows.map((row) => row.participantId));
}

export async function hasParticipantSubmittedFeedback(
  quizId: string,
  participantId: string,
): Promise<boolean> {
  const form = await prisma.feedbackForm.findFirst({
    where: { quizId, isActive: true, isClosed: false },
    select: { id: true },
  });
  if (!form) return false;
  return hasParticipantSubmittedFeedbackForForm(form.id, participantId);
}

function validateScaleAnswers(scales: FeedbackScale[], scaleAnswers: Record<string, number>): void {
  for (const scale of scales) {
    const idx = scaleAnswers[scale.id];
    const maxIdx = scale.options.length - 1;
    if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > maxIdx) {
      throw new Error(`Выберите ответ для «${scale.label}»`);
    }
  }
  const scaleIds = new Set(scales.map((s) => s.id));
  for (const key of Object.keys(scaleAnswers)) {
    if (!scaleIds.has(key)) {
      throw new Error("Invalid feedback payload");
    }
  }
}

export async function submitFeedbackResponse(input: {
  quizId: string;
  participantId: string;
  scaleAnswers: Record<string, number>;
  openFieldAnswers?: Record<string, string>;
  comment?: string;
}): Promise<string | null> {
  const form = await getActiveFeedbackFormConfig(input.quizId);
  if (!form) throw new Error("Сбор обратной связи сейчас не активен");
  validateScaleAnswers(form.scales, input.scaleAnswers);
  const allowedFieldIds = new Set(form.openFields.map((field) => field.id));
  const openFieldAnswers: Record<string, string> = {};
  for (const [fieldId, value] of Object.entries(input.openFieldAnswers ?? {})) {
    if (!allowedFieldIds.has(fieldId)) {
      throw new Error("Invalid feedback payload");
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      openFieldAnswers[fieldId] = trimmed.slice(0, 2000);
    }
  }
  if (
    input.comment &&
    input.comment.trim().length > 0 &&
    form.openFields[0] &&
    !openFieldAnswers[form.openFields[0].id]
  ) {
    openFieldAnswers[form.openFields[0].id] = input.comment.trim().slice(0, 2000);
  }
  const legacyComment =
    form.openFields.length === 1 ? (openFieldAnswers[form.openFields[0]!.id] ?? null) : null;
  try {
    await prisma.feedbackResponse.create({
      data: {
        feedbackFormId: form.id,
        participantId: input.participantId,
        scaleAnswers: input.scaleAnswers as unknown as Prisma.InputJsonValue,
        openFieldAnswers: openFieldAnswers as unknown as Prisma.InputJsonValue,
        comment: legacyComment,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new Error("Вы уже отправили отзыв");
    }
    throw error;
  }
  return form.id;
}

export async function getFeedbackResultsByFormId(formId: string) {
  const form = await prisma.feedbackForm.findUnique({
    where: { id: formId },
    include: {
      responses: {
        include: { participant: { select: { nickname: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!form) {
    return null;
  }
  const config = mapFormRow(form);
  const scaleStats = config.scales.map((scale) => {
    const counts = Array.from({ length: scale.options.length }, () => 0);
    let sum = 0;
    let count = 0;
    const maxIdx = scale.options.length - 1;
    for (const response of form.responses) {
      const answers =
        response.scaleAnswers && typeof response.scaleAnswers === "object"
          ? (response.scaleAnswers as Record<string, number>)
          : {};
      const idx = answers[scale.id];
      if (typeof idx !== "number" || idx < 0 || idx > maxIdx) continue;
      counts[idx] += 1;
      sum += idx + 1;
      count += 1;
    }
    return {
      scaleId: scale.id,
      label: scale.label,
      options: scale.options,
      counts,
      average: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
      responseCount: count,
    };
  });
  return {
    form: config,
    responseCount: form.responses.length,
    scaleStats,
    responses: form.responses.map((r) => {
      const openFieldAnswers = normalizeResponseOpenFieldAnswers(
        parseOpenFieldAnswers(r.openFieldAnswers),
        r.comment,
        config.openFields,
      );
      const legacyComment =
        config.openFields.length === 1
          ? (openFieldAnswers[config.openFields[0]!.id] ?? null)
          : r.comment;
      return {
        nickname: r.participant.nickname,
        scaleAnswers:
          r.scaleAnswers && typeof r.scaleAnswers === "object"
            ? (r.scaleAnswers as Record<string, number>)
            : {},
        openFieldAnswers,
        comment: legacyComment,
        submittedAt: r.submittedAt.toISOString(),
      };
    }),
  };
}

export async function listFeedbackResultsByQuizId(quizId: string) {
  const forms = await listFeedbackFormsByQuizId(quizId);
  const results = await Promise.all(forms.map((form) => getFeedbackResultsByFormId(form.id)));
  return results.filter((item): item is NonNullable<typeof item> => item != null);
}

export type FeedbackReportItem = {
  formId: string;
  title: string;
  responseCount: number;
  openFields: FeedbackOpenField[];
  scaleStats: Array<{
    scaleId: string;
    label: string;
    options: FeedbackScale["options"];
    counts: number[];
    average: number | null;
    responseCount: number;
  }>;
  responses: Array<{
    nickname: string;
    scaleAnswers: Record<string, number>;
    openFieldAnswers: Record<string, string>;
    comment: string | null;
    submittedAt: string;
  }>;
};

export function mapFeedbackResultsToReportItem(
  results: NonNullable<Awaited<ReturnType<typeof getFeedbackResultsByFormId>>>,
): FeedbackReportItem {
  return {
    formId: results.form.id,
    title: results.form.title,
    responseCount: results.responseCount,
    openFields: results.form.openFields,
    scaleStats: results.scaleStats.map((stat) => ({
      scaleId: stat.scaleId,
      label: stat.label,
      options: stat.options,
      counts: stat.counts,
      average: stat.average,
      responseCount: stat.responseCount,
    })),
    responses: results.responses,
  };
}

export async function getFeedbackResultsForReport(quizId: string): Promise<FeedbackReportItem[]> {
  const results = await listFeedbackResultsByQuizId(quizId);
  return results.filter((item) => item.responseCount > 0).map(mapFeedbackResultsToReportItem);
}

export async function resetFeedbackFormResponses(formId: string, quizId: string): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form || form.quizId !== quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  await prisma.feedbackResponse.deleteMany({ where: { feedbackFormId: formId } });
}

export async function getQuizIdByEventName(eventName: string): Promise<string | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: eventName },
    select: { id: true },
  });
  return quiz?.id ?? null;
}

export async function emitAllFeedbackResultsForQuiz(
  emit: (payload: NonNullable<Awaited<ReturnType<typeof getFeedbackResultsByFormId>>>) => void,
  quizId: string,
): Promise<void> {
  const results = await listFeedbackResultsByQuizId(quizId);
  for (const payload of results) {
    emit(payload);
  }
}
