import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export const FEEDBACK_SCALE_MIN_OPTIONS = 2;
export const FEEDBACK_SCALE_MAX_OPTIONS = 10;
export const FEEDBACK_OPEN_FIELD_MAX = 10;
/** Стабильный id для legacy-форм с commentEnabled и пустым openFields в БД. */
export const LEGACY_FEEDBACK_OPEN_FIELD_ID = "legacy-comment";

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

export type FeedbackScaleCountOverride = { text: string; count: number };

export type FeedbackInjectedResponse = {
  id: string;
  nickname: string;
  openFieldAnswers: Record<string, string>;
  submittedAt: string;
};

export type FeedbackResultResponseRow = {
  nickname: string;
  scaleAnswers: Record<string, number>;
  openFieldAnswers: Record<string, string>;
  comment: string | null;
  submittedAt: string;
  isInjected?: boolean;
  injectedId?: string;
};

export function feedbackScaleOverrideKey(scaleId: string, optionIndex: number): string {
  return `${scaleId}:${optionIndex}`;
}

export function parseScaleCountOverrides(json: unknown): FeedbackScaleCountOverride[] {
  if (!Array.isArray(json)) return [];
  const out: FeedbackScaleCountOverride[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const text = (item as { text?: unknown }).text;
    const count = (item as { count?: unknown }).count;
    if (typeof text !== "string" || !text.trim()) continue;
    if (typeof count !== "number" || !Number.isFinite(count)) continue;
    out.push({ text: text.trim(), count: Math.max(0, Math.trunc(count)) });
  }
  return out;
}

export function parseInjectedResponses(json: unknown): FeedbackInjectedResponse[] {
  if (!Array.isArray(json)) return [];
  const out: FeedbackInjectedResponse[] = [];
  for (const item of json) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as {
      id?: unknown;
      nickname?: unknown;
      openFieldAnswers?: unknown;
      submittedAt?: unknown;
    };
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    if (typeof row.nickname !== "string" || !row.nickname.trim()) continue;
    const openFieldAnswers = parseOpenFieldAnswers(row.openFieldAnswers);
    if (Object.keys(openFieldAnswers).length === 0) continue;
    const submittedAt =
      typeof row.submittedAt === "string" && row.submittedAt.trim()
        ? row.submittedAt.trim()
        : new Date().toISOString();
    out.push({
      id: row.id.trim().slice(0, 80),
      nickname: row.nickname.trim().slice(0, 80),
      openFieldAnswers,
      submittedAt,
    });
  }
  return out.slice(0, 500);
}

function validateInjectedOpenFieldAnswers(
  openFields: FeedbackOpenField[],
  raw: Record<string, string>,
): Record<string, string> {
  const allowedFieldIds = new Set(openFields.map((field) => field.id));
  const out: Record<string, string> = {};
  for (const [fieldId, value] of Object.entries(raw)) {
    if (!allowedFieldIds.has(fieldId)) {
      throw new Error("Invalid feedback payload");
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      out[fieldId] = trimmed.slice(0, 2000);
    }
  }
  if (Object.keys(out).length === 0) {
    throw new Error("Введите текст ответа");
  }
  return out;
}

function mapResponseRowFromDb(
  r: {
    scaleAnswers: unknown;
    openFieldAnswers: unknown;
    comment: string | null;
    submittedAt: Date;
    participant: { nickname: string };
  },
  openFields: FeedbackOpenField[],
): FeedbackResultResponseRow {
  const openFieldAnswers = normalizeResponseOpenFieldAnswers(
    parseOpenFieldAnswers(r.openFieldAnswers),
    r.comment,
    openFields,
  );
  const legacyComment =
    openFields.length === 1 ? (openFieldAnswers[openFields[0]!.id] ?? null) : r.comment;
  return {
    nickname: r.participant.nickname,
    scaleAnswers:
      r.scaleAnswers && typeof r.scaleAnswers === "object"
        ? (r.scaleAnswers as Record<string, number>)
        : {},
    openFieldAnswers,
    comment: legacyComment,
    submittedAt: r.submittedAt.toISOString(),
    isInjected: false,
  };
}

function mapResponseRowFromInjected(
  injected: FeedbackInjectedResponse,
  openFields: FeedbackOpenField[],
): FeedbackResultResponseRow {
  const openFieldAnswers = normalizeResponseOpenFieldAnswers(
    injected.openFieldAnswers,
    null,
    openFields,
  );
  const legacyComment =
    openFields.length === 1 ? (openFieldAnswers[openFields[0]!.id] ?? null) : null;
  return {
    nickname: injected.nickname,
    scaleAnswers: {},
    openFieldAnswers,
    comment: legacyComment,
    submittedAt: injected.submittedAt,
    isInjected: true,
    injectedId: injected.id,
  };
}

export function applyScaleCountOverridesToRaw(
  scaleId: string,
  rawCounts: number[],
  overrides: FeedbackScaleCountOverride[],
): number[] {
  if (overrides.length === 0) return rawCounts;
  return rawCounts.map((live, idx) => {
    const key = feedbackScaleOverrideKey(scaleId, idx);
    const row = overrides.find((item) => item.text === key);
    return row !== undefined ? row.count : live;
  });
}

export function computeScaleAverageFromCounts(counts: number[]): number | null {
  let sum = 0;
  let total = 0;
  for (let idx = 0; idx < counts.length; idx++) {
    const count = counts[idx] ?? 0;
    if (count <= 0) continue;
    sum += count * (idx + 1);
    total += count;
  }
  return total > 0 ? Math.round((sum / total) * 100) / 100 : null;
}

function computeRawScaleCounts(
  scale: FeedbackScale,
  responses: Array<{ scaleAnswers: unknown }>,
): { counts: number[]; average: number | null; responseCount: number } {
  const counts = Array.from({ length: scale.options.length }, () => 0);
  let sum = 0;
  let count = 0;
  const maxIdx = scale.options.length - 1;
  for (const response of responses) {
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
    counts,
    average: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
    responseCount: count,
  };
}

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
        id: LEGACY_FEEDBACK_OPEN_FIELD_ID,
        label: "Комментарий",
        placeholder: (commentPlaceholder ?? "").trim().slice(0, 300),
      },
    ];
  }
  return [];
}

export function resolveSubmitOpenFieldAnswers(
  openFields: FeedbackOpenField[],
  raw?: Record<string, string>,
): Record<string, string> {
  const allowedFieldIds = new Set(openFields.map((field) => field.id));
  const trimmedEntries = Object.entries(raw ?? {})
    .map(([fieldId, value]) => [fieldId, value.trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (trimmedEntries.length === 0) return {};

  const resolved: Record<string, string> = {};
  const unknown: Array<[string, string]> = [];

  for (const [fieldId, value] of trimmedEntries) {
    if (allowedFieldIds.has(fieldId)) {
      resolved[fieldId] = value.slice(0, 2000);
    } else {
      unknown.push([fieldId, value]);
    }
  }

  if (unknown.length === 0) return resolved;

  // Раньше legacy-поле получало новый randomUUID при каждом parse — принимаем один «чужой» ключ.
  if (unknown.length === 1 && openFields.length === 1 && Object.keys(resolved).length === 0) {
    resolved[openFields[0]!.id] = unknown[0]![1].slice(0, 2000);
    return resolved;
  }

  throw new Error("Invalid feedback payload");
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
  const openFieldAnswers = resolveSubmitOpenFieldAnswers(form.openFields, input.openFieldAnswers);
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
  const scaleCountOverrides = parseScaleCountOverrides(form.scaleCountOverrides);
  const injectedResponses = parseInjectedResponses(form.injectedResponses);
  const scaleStats = config.scales.map((scale) => {
    const raw = computeRawScaleCounts(scale, form.responses);
    const counts = applyScaleCountOverridesToRaw(scale.id, raw.counts, scaleCountOverrides);
    return {
      scaleId: scale.id,
      label: scale.label,
      options: scale.options,
      counts,
      average: computeScaleAverageFromCounts(counts),
      responseCount: raw.responseCount,
    };
  });
  const realResponses = form.responses.map((r) => mapResponseRowFromDb(r, config.openFields));
  const injectedRows = injectedResponses.map((row) =>
    mapResponseRowFromInjected(row, config.openFields),
  );
  const responses = [...realResponses, ...injectedRows].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
  return {
    form: config,
    responseCount: form.responses.length + injectedResponses.length,
    scaleCountOverrides,
    scaleStats,
    responses,
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

/** Формы для отчёта с учётом reportFeedbackFormIds; устаревшие id не скрывают весь блок. */
export function filterFeedbackFormsForReport(
  forms: FeedbackReportItem[],
  reportFeedbackFormIds: string[],
): FeedbackReportItem[] {
  if (forms.length === 0 || reportFeedbackFormIds.length === 0) return forms;
  const formIdSet = new Set(forms.map((form) => form.formId));
  const validIds = reportFeedbackFormIds.filter((id) => formIdSet.has(id));
  if (validIds.length === 0) return forms;
  const pick = new Set(validIds);
  return forms.filter((form) => pick.has(form.formId));
}

export function feedbackFormDisplayResponseCount(form: FeedbackReportItem): number {
  if (form.responseCount > 0) return form.responseCount;
  return form.scaleStats.reduce((max, stat) => {
    const total = stat.counts.reduce((sum, count) => sum + count, 0);
    return Math.max(max, total);
  }, 0);
}

/** Формы для отчёта с учётом reportFeedbackFormIds (включая нулевые и ручные правки). */
export function selectFeedbackFormsForReport(
  mapped: FeedbackReportItem[],
  reportFeedbackFormIds: string[],
): FeedbackReportItem[] {
  return filterFeedbackFormsForReport(mapped, reportFeedbackFormIds);
}

export async function getFeedbackResultsForReport(
  quizId: string,
  reportFeedbackFormIds: string[] = [],
): Promise<FeedbackReportItem[]> {
  const results = await listFeedbackResultsByQuizId(quizId);
  const mapped = results
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map(mapFeedbackResultsToReportItem);
  return selectFeedbackFormsForReport(mapped, reportFeedbackFormIds);
}

export async function resetFeedbackFormResponses(formId: string, quizId: string): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form || form.quizId !== quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  await prisma.$transaction([
    prisma.feedbackResponse.deleteMany({ where: { feedbackFormId: formId } }),
    prisma.feedbackForm.update({
      where: { id: formId },
      data: { scaleCountOverrides: [], injectedResponses: [] },
    }),
  ]);
}

export async function setFeedbackScaleCountOverride(params: {
  formId: string;
  quizId: string;
  scaleId: string;
  optionIndex: number;
  count: number;
}): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({
    where: { id: params.formId },
    include: { responses: true },
  });
  if (!form || form.quizId !== params.quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  const scales = parseFeedbackScales(form.scales);
  const scale = scales.find((item) => item.id === params.scaleId);
  if (!scale) {
    throw new Error("Шкала не найдена");
  }
  if (params.optionIndex < 0 || params.optionIndex >= scale.options.length) {
    throw new Error("Недопустимый вариант шкалы");
  }
  const raw = computeRawScaleCounts(scale, form.responses);
  const liveCount = raw.counts[params.optionIndex] ?? 0;
  const safeCount = Math.max(0, Math.trunc(params.count));
  const key = feedbackScaleOverrideKey(params.scaleId, params.optionIndex);
  let overrides = parseScaleCountOverrides(form.scaleCountOverrides);
  if (safeCount === liveCount) {
    overrides = overrides.filter((item) => item.text !== key);
  } else {
    overrides = [...overrides.filter((item) => item.text !== key), { text: key, count: safeCount }];
  }
  await prisma.feedbackForm.update({
    where: { id: params.formId },
    data: { scaleCountOverrides: overrides as unknown as Prisma.InputJsonValue },
  });
}

export async function clearFeedbackScaleCountOverride(params: {
  formId: string;
  quizId: string;
  scaleId: string;
  optionIndex: number;
}): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: params.formId } });
  if (!form || form.quizId !== params.quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  const key = feedbackScaleOverrideKey(params.scaleId, params.optionIndex);
  const overrides = parseScaleCountOverrides(form.scaleCountOverrides).filter(
    (item) => item.text !== key,
  );
  await prisma.feedbackForm.update({
    where: { id: params.formId },
    data: { scaleCountOverrides: overrides as unknown as Prisma.InputJsonValue },
  });
}

export async function clearAllFeedbackScaleCountOverrides(
  formId: string,
  quizId: string,
): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: formId } });
  if (!form || form.quizId !== quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  await prisma.feedbackForm.update({
    where: { id: formId },
    data: { scaleCountOverrides: [] },
  });
}

export async function addInjectedFeedbackResponse(params: {
  formId: string;
  quizId: string;
  nickname: string;
  openFieldAnswers: Record<string, string>;
}): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: params.formId } });
  if (!form || form.quizId !== params.quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  const config = mapFormRow(form);
  if (config.openFields.length === 0) {
    throw new Error("В форме нет текстовых полей");
  }
  const nickname = params.nickname.trim().slice(0, 80);
  if (!nickname) {
    throw new Error("Введите имя");
  }
  const openFieldAnswers = validateInjectedOpenFieldAnswers(
    config.openFields,
    params.openFieldAnswers,
  );
  const injected = parseInjectedResponses(form.injectedResponses);
  const next: FeedbackInjectedResponse = {
    id: randomUUID(),
    nickname,
    openFieldAnswers,
    submittedAt: new Date().toISOString(),
  };
  await prisma.feedbackForm.update({
    where: { id: params.formId },
    data: {
      injectedResponses: [...injected, next] as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function removeInjectedFeedbackResponse(params: {
  formId: string;
  quizId: string;
  injectedId: string;
}): Promise<void> {
  const form = await prisma.feedbackForm.findUnique({ where: { id: params.formId } });
  if (!form || form.quizId !== params.quizId) {
    throw new Error("Форма обратной связи не найдена");
  }
  const injectedId = params.injectedId.trim();
  const injected = parseInjectedResponses(form.injectedResponses).filter(
    (row) => row.id !== injectedId,
  );
  await prisma.feedbackForm.update({
    where: { id: params.formId },
    data: { injectedResponses: injected as unknown as Prisma.InputJsonValue },
  });
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
