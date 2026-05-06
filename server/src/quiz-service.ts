import { normalizeTagComparable, type PublicViewState } from "@meyouquize/shared";
import {
  Prisma,
  QuestionType,
  QuestionFlowMode,
  QuizStatus,
  RankingKind,
  RankingProjectorMetric,
  ScoringMode,
} from "@prisma/client";
import { prisma } from "./prisma.js";
import { publicViewJsonToState } from "./socket/public-view-store.js";
import { parseSelectedIds, randomSlug, randomToken } from "./utils.js";
import { evaluateAnswer, evaluateRankingAnswer } from "./scoring.js";
import { containsProfanity } from "./profanity.js";
import { getReactionSessionPublic } from "./reactions-service.js";

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

function normalizeTag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Совпадение хотя бы с одним эталонным тегом (после normalizeTagComparable). */
function evaluateTagCloudQuizAnswer(
  question: QuestionWithOptions,
  userTagsComparable: string[],
): boolean {
  const reference = question.options
    .filter((o) => o.isCorrect)
    .map((o) => normalizeTagComparable(o.text))
    .filter(Boolean);
  if (reference.length === 0) return false;
  const userSet = new Set(userTagsComparable);
  return reference.some((r) => userSet.has(r));
}

function parseTagAnswers(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTag).filter(Boolean);
  } catch {
    return [];
  }
}

function sortActiveQuestionsByActivation<T extends { activatedAt: Date | null; order: number }>(
  questions: T[],
): T[] {
  return [...questions].sort((a, b) => {
    const aTs = a.activatedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bTs = b.activatedAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aTs !== bTs) return aTs - bTs;
    return a.order - b.order;
  });
}

function isStoredAnswerValidForQuestion(
  question: { type: QuestionType; options: Array<{ id: string }> },
  rawSelectedOptionIds: string,
): boolean {
  if (question.type === QuestionType.TAG_CLOUD) {
    return parseTagAnswers(rawSelectedOptionIds).length > 0;
  }
  const selected = parseSelectedIds(rawSelectedOptionIds);
  if (selected.length < 1) return false;
  const allowed = new Set(question.options.map((o) => o.id));
  if (question.type === QuestionType.RANKING) {
    if (selected.length !== question.options.length) return false;
    if (new Set(selected).size !== selected.length) return false;
  }
  return selected.every((id) => allowed.has(id));
}

/** Лимит тегов в ответе дашборда — снижает CPU/память при больших облаках. */
const TAG_CLOUD_TAGS_DASHBOARD_CAP = 500;
/** Макс. число «первых верных» в payload дашборда на вопрос (клиент режет по настройке экрана). */
const DASHBOARD_FIRST_CORRECT_CAP = 20;

/** Строка вопроса для дашборда: только поля, нужные mapPerQuestion. */
type QuestionDashboardRow = Prisma.QuestionGetPayload<{
  select: {
    id: true;
    text: true;
    subQuizId: true;
    type: true;
    projectorShowFirstCorrect: true;
    projectorFirstCorrectWinnersCount: true;
    rankingPointsByRank: true;
    rankingProjectorMetric: true;
    rankingKind: true;
    options: { select: { id: true; text: true; isCorrect: true; sortOrder: true } };
    answers: { select: { selectedOptionIds: true } };
  };
}>;

export type QuestionReplaceInput = {
  id?: string;
  text: string;
  type: "single" | "multi" | "tag_cloud" | "ranking";
  points: number;
  maxAnswers?: number;
  scoringMode?: "poll" | "quiz";
  /** Показывать победителей на проекторе для этого вопроса (вместе с глобальной настройкой комнаты). */
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  /** Для ranking: баллы за совпадение на каждой позиции; null/undefined — только полный ответ даёт `points`. */
  rankingPointsByRank?: number[] | null;
  /** Для ranking: метрика на проекторе */
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  /** RANKING: квиз (эталон) или жюри (без верного ответа) */
  rankingKind?: "quiz" | "jury";
  /** Для RANKING: кастомная подсказка игроку; null/undefined = текст по умолчанию. */
  rankingPlayerHint?: string | null;
  options: Array<{ text: string; isCorrect: boolean }>;
};

function parseRankingTiersJson(value: unknown): number[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const x of value) {
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    const t = Math.trunc(x);
    if (t < 0 || t > 10_000) return null;
    out.push(t);
  }
  return out.length > 0 ? out : null;
}

function rankingMetricToPrisma(
  m: QuestionReplaceInput["rankingProjectorMetric"] | undefined,
): RankingProjectorMetric {
  switch (m) {
    case "avg_score":
      return RankingProjectorMetric.AVG_SCORE;
    case "total_score":
      return RankingProjectorMetric.TOTAL_SCORE;
    case "avg_rank":
    default:
      return RankingProjectorMetric.AVG_RANK;
  }
}

function rankingMetricToApi(m: RankingProjectorMetric): "avg_rank" | "avg_score" | "total_score" {
  switch (m) {
    case RankingProjectorMetric.AVG_SCORE:
      return "avg_score";
    case RankingProjectorMetric.TOTAL_SCORE:
      return "total_score";
    case RankingProjectorMetric.AVG_RANK:
    default:
      return "avg_rank";
  }
}

function rankingKindToPrisma(k: QuestionReplaceInput["rankingKind"] | undefined): RankingKind {
  return k === "jury" ? RankingKind.JURY : RankingKind.QUIZ;
}

function rankingKindToApi(k: RankingKind): "quiz" | "jury" {
  return k === RankingKind.JURY ? "jury" : "quiz";
}

function rankingExpectedIdsFromQuestion(
  options: Array<{ id: string }>,
  rankingKind: RankingKind,
  rankingPointsByRank: unknown,
): string[] {
  const fallback = options.map((o) => o.id);
  if (rankingKind !== RankingKind.QUIZ) return fallback;
  const n = options.length;
  const places = parseRankingTiersJson(rankingPointsByRank);
  if (places == null || places.length !== n) return fallback;
  const out = new Array<string>(n);
  const seen = new Set<number>();
  for (let i = 0; i < n; i += 1) {
    const p = places[i]!;
    if (p < 1 || p > n || seen.has(p)) return fallback;
    seen.add(p);
    out[p - 1] = options[i]!.id;
  }
  if (out.some((x) => !x)) return fallback;
  return out as string[];
}

export type SubQuizReplaceInput = {
  id?: string;
  title: string;
  questionFlowMode?: "manual" | "auto";
  sortOrder?: number;
  questions: QuestionReplaceInput[];
};

export type RoomContentReplaceInput = {
  subQuizzes: SubQuizReplaceInput[];
  standaloneQuestions: QuestionReplaceInput[];
};

function inputTypeToPrisma(t: QuestionReplaceInput["type"]): QuestionType {
  switch (t) {
    case "single":
      return QuestionType.SINGLE;
    case "multi":
      return QuestionType.MULTI;
    case "tag_cloud":
      return QuestionType.TAG_CLOUD;
    case "ranking":
      return QuestionType.RANKING;
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

function prismaTypeToApi(t: QuestionType): "single" | "multi" | "tag_cloud" | "ranking" {
  switch (t) {
    case QuestionType.SINGLE:
      return "single";
    case QuestionType.MULTI:
      return "multi";
    case QuestionType.TAG_CLOUD:
      return "tag_cloud";
    case QuestionType.RANKING:
      return "ranking";
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

function pointsForReplaceQuestion(q: QuestionReplaceInput): number {
  return q.type === "tag_cloud" ? 1 : q.points;
}

function maxAnswersForReplaceQuestion(q: QuestionReplaceInput): number {
  if (q.type === "tag_cloud") return q.maxAnswers ?? 3;
  if (q.type === "ranking") return q.options.length;
  return 1;
}

function optionsCreateRows(questionId: string, options: QuestionReplaceInput["options"]) {
  return options.map((o, idx) => ({
    questionId,
    text: o.text,
    isCorrect: o.isCorrect,
    sortOrder: idx,
  }));
}

function toScoringMode(q: QuestionReplaceInput): ScoringMode {
  if (q.type === "tag_cloud") {
    return q.scoringMode === "quiz" ? ScoringMode.QUIZ : ScoringMode.POLL;
  }
  return q.scoringMode === "poll" ? ScoringMode.POLL : ScoringMode.QUIZ;
}

function rankingQuestionCreateData(q: QuestionReplaceInput) {
  if (q.type !== "ranking") return {};
  const tiers =
    q.rankingPointsByRank != null && q.rankingPointsByRank.length === q.options.length
      ? q.rankingPointsByRank
      : null;
  return {
    rankingPointsByRank: tiers === null ? Prisma.DbNull : tiers,
    rankingProjectorMetric: rankingMetricToPrisma(q.rankingProjectorMetric),
    rankingKind: rankingKindToPrisma(q.rankingKind),
    rankingPlayerHint:
      q.rankingPlayerHint != null && q.rankingPlayerHint.trim() !== ""
        ? q.rankingPlayerHint.trim()
        : null,
  };
}

export async function createQuiz(input: {
  title: string;
  questions: Array<{
    text: string;
    type: "single" | "multi" | "tag_cloud" | "ranking";
    points: number;
    maxAnswers?: number;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>;
}) {
  const quiz = await prisma.quiz.create({
    data: {
      title: input.title,
      slug: randomSlug(),
      accessToken: randomToken(),
      status: QuizStatus.DRAFT,
    },
  });
  const sub = await prisma.subQuiz.create({
    data: {
      quizId: quiz.id,
      title: "Квиз 1",
      sortOrder: 0,
    },
  });
  for (let index = 0; index < input.questions.length; index += 1) {
    const q = input.questions[index] as QuestionReplaceInput;
    const mode = q.type === "tag_cloud" ? ScoringMode.POLL : ScoringMode.QUIZ;
    const createdQ = await prisma.question.create({
      data: {
        quizId: quiz.id,
        subQuizId: sub.id,
        text: q.text,
        type: inputTypeToPrisma(q.type),
        order: index,
        points: pointsForReplaceQuestion(q),
        maxAnswers: maxAnswersForReplaceQuestion(q),
        scoringMode: mode,
      },
    });
    if (q.type !== "tag_cloud") {
      await prisma.option.createMany({
        data: optionsCreateRows(createdQ.id, q.options),
      });
    }
  }
  return prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: {
      subQuizzes: true,
      questions: {
        include: { options: { orderBy: { sortOrder: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function createRoom(input: { eventName: string; title: string }) {
  const titleKey = input.title.trim().toLowerCase();
  const allRooms = await prisma.quiz.findMany({ select: { title: true } });
  const hasDuplicateTitle = allRooms.some((room) => room.title.trim().toLowerCase() === titleKey);
  if (hasDuplicateTitle) throw new Error("Room title already exists");
  return prisma.quiz.create({
    data: {
      title: input.title,
      slug: input.eventName,
      accessToken: randomToken(),
      status: QuizStatus.DRAFT,
    },
  });
}

export async function listRooms() {
  return prisma.quiz.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { questions: true, participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const roomInclude = {
  subQuizzes: { orderBy: { sortOrder: "asc" as const } },
  questions: {
    include: { options: { orderBy: { sortOrder: "asc" as const } } },
    orderBy: { order: "asc" as const },
  },
} satisfies Prisma.QuizInclude;

export async function getRoomByEventName(eventName: string) {
  return prisma.quiz.findUnique({
    where: { slug: eventName },
    include: roomInclude,
  });
}

export async function listParticipantNicknamesByEventName(eventName: string): Promise<string[]> {
  const room = await prisma.quiz.findUnique({
    where: { slug: eventName },
    select: { id: true },
  });
  if (!room) return [];
  const participants = await prisma.participant.findMany({
    where: { quizId: room.id },
    select: { nickname: true },
    orderBy: { createdAt: "asc" },
  });
  const deduped: string[] = [];
  for (const row of participants) {
    const nickname = row.nickname.trim();
    if (!nickname) continue;
    if (!deduped.includes(nickname)) deduped.push(nickname);
  }
  return deduped;
}

export async function updateRoomTitle(eventName: string, title: string) {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName } });
  if (!room) throw new Error("Room not found");
  const normalizedTitle = title.trim();
  const titleKey = normalizedTitle.toLowerCase();
  const allRooms = await prisma.quiz.findMany({
    where: { NOT: { id: room.id } },
    select: { title: true },
  });
  if (titleKey) {
    const hasDuplicateTitle = allRooms.some((item) => item.title.trim().toLowerCase() === titleKey);
    if (hasDuplicateTitle) throw new Error("Room title already exists");
  }
  return prisma.quiz.update({
    where: { id: room.id },
    data: { title: normalizedTitle },
  });
}

export async function replaceRoomContent(eventName: string, content: RoomContentReplaceInput) {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName } });
  if (!room) throw new Error("Room not found");
  const roomId = room.id;
  await prisma.$transaction(async (tx) => {
    const existingSubQuizzes = await tx.subQuiz.findMany({
      where: { quizId: roomId },
      select: { id: true },
    });
    const existingSubQuizIds = new Set(existingSubQuizzes.map((sq) => sq.id));
    const existingQuestions = await tx.question.findMany({
      where: { quizId: roomId },
      select: { id: true },
    });
    const existingQuestionIds = new Set(existingQuestions.map((q) => q.id));
    const keptSubQuizIds = new Set<string>();
    const keptQuestionIds = new Set<string>();

    async function upsertQuestion(
      q: QuestionReplaceInput,
      subQuizId: string | null,
      order: number,
    ) {
      async function syncOptionsForQuestion(
        questionId: string,
        options: QuestionReplaceInput["options"],
      ) {
        const existing = await tx.option.findMany({
          where: { questionId },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        });
        const keepCount = Math.min(existing.length, options.length);
        for (let idx = 0; idx < keepCount; idx += 1) {
          const opt = options[idx]!;
          const existingId = existing[idx]!.id;
          await tx.option.update({
            where: { id: existingId },
            data: {
              text: opt.text,
              isCorrect: opt.isCorrect,
              sortOrder: idx,
            },
          });
        }
        if (options.length > existing.length) {
          await tx.option.createMany({
            data: options.slice(existing.length).map((opt, relIdx) => ({
              questionId,
              text: opt.text,
              isCorrect: opt.isCorrect,
              sortOrder: existing.length + relIdx,
            })),
          });
        } else if (existing.length > options.length) {
          const deleteIds = existing.slice(options.length).map((o) => o.id);
          await tx.option.deleteMany({ where: { id: { in: deleteIds } } });
        }
      }

      const mode = toScoringMode(q);
      const questionData = {
        quizId: roomId,
        subQuizId,
        text: q.text,
        type: inputTypeToPrisma(q.type),
        order,
        points: pointsForReplaceQuestion(q),
        maxAnswers: maxAnswersForReplaceQuestion(q),
        scoringMode: mode,
        projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
        projectorFirstCorrectWinnersCount: Math.max(
          1,
          Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
        ),
        ...rankingQuestionCreateData(q),
      };
      let targetQuestionId: string;
      if (q.id && existingQuestionIds.has(q.id)) {
        await tx.question.update({
          where: { id: q.id },
          data: questionData,
        });
        targetQuestionId = q.id;
      } else {
        const createdQ = await tx.question.create({ data: questionData });
        targetQuestionId = createdQ.id;
      }
      keptQuestionIds.add(targetQuestionId);
      await syncOptionsForQuestion(targetQuestionId, q.options);
    }

    const subRows: { id: string; sortOrder: number }[] = [];
    let sortBase = 0;
    for (const sq of content.subQuizzes) {
      const nextSortOrder = sq.sortOrder ?? sortBase;
      let subQuizId: string;
      if (sq.id && existingSubQuizIds.has(sq.id)) {
        const updatedSq = await tx.subQuiz.update({
          where: { id: sq.id },
          data: {
            title: sq.title,
            questionFlowMode:
              sq.questionFlowMode === "auto" ? QuestionFlowMode.AUTO : QuestionFlowMode.MANUAL,
            sortOrder: nextSortOrder,
          },
        });
        subQuizId = updatedSq.id;
        subRows.push({ id: updatedSq.id, sortOrder: updatedSq.sortOrder });
      } else {
        const createdSq = await tx.subQuiz.create({
          data: {
            quizId: roomId,
            title: sq.title,
            questionFlowMode:
              sq.questionFlowMode === "auto" ? QuestionFlowMode.AUTO : QuestionFlowMode.MANUAL,
            sortOrder: nextSortOrder,
          },
        });
        subQuizId = createdSq.id;
        subRows.push({ id: createdSq.id, sortOrder: createdSq.sortOrder });
      }
      keptSubQuizIds.add(subQuizId);
      sortBase += 1;
      for (let i = 0; i < sq.questions.length; i += 1) {
        await upsertQuestion(sq.questions[i]!, subQuizId, i);
      }
    }
    for (let i = 0; i < content.standaloneQuestions.length; i += 1) {
      await upsertQuestion(content.standaloneQuestions[i]!, null, i);
    }
    await tx.question.deleteMany({
      where: {
        quizId: roomId,
        id: { notIn: Array.from(keptQuestionIds) },
      },
    });
    await tx.subQuiz.deleteMany({
      where: {
        quizId: roomId,
        id: { notIn: Array.from(keptSubQuizIds) },
      },
    });
  });
  return getRoomByEventName(eventName);
}

export async function patchQuestionProjectorSettings(
  eventName: string,
  questionId: string,
  patch: {
    projectorShowFirstCorrect?: boolean;
    projectorFirstCorrectWinnersCount?: number;
    rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  },
): Promise<void> {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName }, select: { id: true } });
  if (!room) throw new Error("Room not found");
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId: room.id },
    select: { id: true, type: true },
  });
  if (!question) throw new Error("Question not found");

  const data: {
    projectorShowFirstCorrect?: boolean;
    projectorFirstCorrectWinnersCount?: number;
    rankingProjectorMetric?: RankingProjectorMetric;
  } = {};
  if (typeof patch.projectorShowFirstCorrect === "boolean") {
    data.projectorShowFirstCorrect = patch.projectorShowFirstCorrect;
  }
  if (typeof patch.projectorFirstCorrectWinnersCount === "number") {
    data.projectorFirstCorrectWinnersCount = Math.max(
      1,
      Math.min(20, Math.trunc(patch.projectorFirstCorrectWinnersCount)),
    );
  }
  if (patch.rankingProjectorMetric !== undefined) {
    if (question.type !== QuestionType.RANKING) {
      throw new Error("Метрика проектора задаётся только для вопроса с ранжированием");
    }
    data.rankingProjectorMetric = rankingMetricToPrisma(patch.rankingProjectorMetric);
  }
  if (Object.keys(data).length === 0) return;

  await prisma.question.update({
    where: { id: questionId },
    data,
  });
}

/** @deprecated use replaceRoomContent */
export async function replaceQuizQuestions(
  eventName: string,
  questions: Array<{
    text: string;
    type: "single" | "multi" | "tag_cloud" | "ranking";
    points: number;
    maxAnswers?: number;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>,
) {
  return replaceRoomContent(eventName, {
    subQuizzes: [{ title: "Квиз 1", sortOrder: 0, questions }],
    standaloneQuestions: [],
  });
}

export type QuizProgressPayload = {
  subQuizId: string;
  questionFlowMode: "manual" | "auto";
  index: number;
  total: number;
};

export type PlayerVisibleResultTile = {
  questionId: string;
  text: string;
  type: "single" | "multi" | "ranking";
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  optionStats: Array<{
    optionId: string;
    text: string;
    count: number;
    isCorrect: boolean;
    avgRank?: number;
    avgScore?: number;
    totalScore?: number;
  }>;
};

export async function getQuizPublicState(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: { orderBy: { sortOrder: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!quiz) return null;
  const activeQuestions = sortActiveQuestionsByActivation(quiz.questions.filter((q) => q.isActive));
  const activeQuestion = activeQuestions[0];
  let quizProgress: QuizProgressPayload | null = null;
  const view = publicViewJsonToState(quiz.publicView as Prisma.JsonValue | null);
  const playerVisibleResults = await getPlayerVisibleResultsForQuiz(
    quiz.id,
    view.playerVisibleResultQuestionIds ?? [],
  );
  if (activeQuestion?.subQuizId) {
    const [inSub, subQuiz] = await Promise.all([
      prisma.question.findMany({
        where: { subQuizId: activeQuestion.subQuizId },
        orderBy: { order: "asc" },
        select: { id: true },
      }),
      prisma.subQuiz.findUnique({
        where: { id: activeQuestion.subQuizId },
        select: { questionFlowMode: true },
      }),
    ]);
    const idx = inSub.findIndex((q) => q.id === activeQuestion.id);
    if (idx >= 0) {
      quizProgress = {
        subQuizId: activeQuestion.subQuizId,
        questionFlowMode: subQuiz?.questionFlowMode === QuestionFlowMode.AUTO ? "auto" : "manual",
        index: idx + 1,
        total: inSub.length,
      };
    }
  }
  return {
    id: quiz.id,
    title: quiz.title,
    slug: quiz.slug,
    status: quiz.status,
    showEventTitleOnPlayer: view.showEventTitleOnPlayer,
    playerBanners: view.playerBanners,
    activePlayerBannerId: view.activePlayerBannerId,
    speakerTileText: view.speakerTileText,
    speakerTileBackgroundColor: view.speakerTileBackgroundColor,
    speakerTileTextColor: view.speakerTileTextColor,
    speakerTileVisible: view.speakerTileVisible,
    programTileText: view.programTileText,
    programTileBackgroundColor: view.programTileBackgroundColor,
    programTileTextColor: view.programTileTextColor,
    programTileLinkUrl: view.programTileLinkUrl,
    programTileVisible: view.programTileVisible,
    playerVoteOptionTextColor: view.playerVoteOptionTextColor,
    playerVoteProgressTrackColor: view.playerVoteProgressTrackColor,
    playerVoteProgressBarColor: view.playerVoteProgressBarColor,
    playerVisibleResults,
    playerTilesOrder: view.playerTilesOrder,
    brandPrimaryColor: view.brandPrimaryColor,
    brandAccentColor: view.brandAccentColor,
    brandSurfaceColor: view.brandSurfaceColor,
    brandTextColor: view.brandTextColor,
    brandFontFamily: view.brandFontFamily,
    brandFontUrl: view.brandFontUrl,
    brandLogoUrl: view.brandLogoUrl,
    brandPlayerBackgroundImageUrl: view.brandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl: view.brandProjectorBackgroundImageUrl,
    brandBodyBackgroundColor: view.brandBodyBackgroundColor,
    reactionSession: getReactionSessionPublic(quiz.id),
    quizProgress,
    activeQuestions: activeQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      type: prismaTypeToApi(q.type),
      maxAnswers: q.maxAnswers,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      isClosed: q.isClosed,
      rankingKind: q.type === QuestionType.RANKING ? rankingKindToApi(q.rankingKind) : undefined,
      rankingPlayerHint:
        q.type === QuestionType.RANKING ? (q.rankingPlayerHint ?? undefined) : undefined,
      rankingPointsByRank:
        q.type === QuestionType.RANKING
          ? (() => {
              if (q.rankingKind !== RankingKind.JURY) return undefined;
              const n = q.options.length;
              const tiers = parseRankingTiersJson(q.rankingPointsByRank);
              return tiers != null && tiers.length === n ? tiers : undefined;
            })()
          : undefined,
    })),
    activeQuestion: activeQuestion
      ? {
          id: activeQuestion.id,
          text: activeQuestion.text,
          type: prismaTypeToApi(activeQuestion.type),
          maxAnswers: activeQuestion.maxAnswers,
          options: activeQuestion.options.map((o) => ({ id: o.id, text: o.text })),
          isClosed: activeQuestion.isClosed,
          rankingKind:
            activeQuestion.type === QuestionType.RANKING
              ? rankingKindToApi(activeQuestion.rankingKind)
              : undefined,
          rankingPlayerHint:
            activeQuestion.type === QuestionType.RANKING
              ? (activeQuestion.rankingPlayerHint ?? undefined)
              : undefined,
          rankingPointsByRank:
            activeQuestion.type === QuestionType.RANKING
              ? (() => {
                  if (activeQuestion.rankingKind !== RankingKind.JURY) return undefined;
                  const n = activeQuestion.options.length;
                  const tiers = parseRankingTiersJson(activeQuestion.rankingPointsByRank);
                  return tiers != null && tiers.length === n ? tiers : undefined;
                })()
              : undefined,
        }
      : null,
  };
}

async function getPlayerVisibleResultsForQuiz(
  quizId: string,
  questionIds: string[],
): Promise<PlayerVisibleResultTile[]> {
  if (questionIds.length === 0) return [];
  const rows = (await prisma.question.findMany({
    where: {
      quizId,
      id: { in: questionIds },
      type: { in: [QuestionType.SINGLE, QuestionType.MULTI, QuestionType.RANKING] },
    },
    select: {
      id: true,
      text: true,
      subQuizId: true,
      type: true,
      projectorShowFirstCorrect: true,
      projectorFirstCorrectWinnersCount: true,
      rankingPointsByRank: true,
      rankingProjectorMetric: true,
      rankingKind: true,
      options: { select: { id: true, text: true, isCorrect: true, sortOrder: true } },
      answers: { select: { selectedOptionIds: true } },
    },
    orderBy: { order: "asc" },
  })) as QuestionDashboardRow[];
  const byId = new Map(mapPerQuestion(rows).map((item) => [item.questionId, item]));
  return questionIds
    .map((qid) => byId.get(qid))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(
      (
        item,
      ): item is NonNullable<typeof item> & {
        type: "single" | "multi" | "ranking";
      } => item.type !== "tag_cloud",
    )
    .map((item) => ({
      questionId: item.questionId,
      text: item.text,
      type: item.type === "ranking" ? "ranking" : item.type,
      rankingProjectorMetric: item.type === "ranking" ? item.rankingProjectorMetric : undefined,
      optionStats: item.optionStats.map((row) => ({
        optionId: row.optionId,
        text: row.text,
        count: row.count,
        isCorrect: row.isCorrect,
        avgRank: row.avgRank,
        avgScore: row.avgScore,
        totalScore: row.totalScore,
      })),
    }));
}

function mapPerQuestion(questions: QuestionDashboardRow[]) {
  return questions.map((q) => {
    const sortedOpts = [...q.options].sort((a, b) => a.sortOrder - b.sortOrder);
    let tagCloud: Array<{ text: string; count: number }> = [];
    if (q.type === QuestionType.TAG_CLOUD) {
      tagCloud = Object.entries(
        q.answers.reduce<Record<string, number>>((acc, answer) => {
          const tags = parseTagAnswers(answer.selectedOptionIds);
          tags.forEach((tag) => {
            acc[tag] = (acc[tag] ?? 0) + 1;
          });
          return acc;
        }, {}),
      )
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"))
        .slice(0, TAG_CLOUD_TAGS_DASHBOARD_CAP);
    }

    let optionStats: Array<{
      optionId: string;
      text: string;
      count: number;
      isCorrect: boolean;
      avgRank?: number;
      avgScore?: number;
      totalScore?: number;
    }>;

    if (q.type === QuestionType.RANKING) {
      const n = sortedOpts.length;
      const expectedIds = sortedOpts.map((o) => o.id);
      const isJury = q.rankingKind === RankingKind.JURY;
      const tiers = parseRankingTiersJson(q.rankingPointsByRank);
      const useTiers = isJury && tiers != null && tiers.length === n;

      const sumsRank: Record<string, number> = {};
      const sumsAvgScore: Record<string, number> = {};
      const sumsTotalScore: Record<string, number> = {};
      sortedOpts.forEach((o) => {
        sumsRank[o.id] = 0;
        sumsAvgScore[o.id] = 0;
        sumsTotalScore[o.id] = 0;
      });
      let answerCount = 0;
      for (const a of q.answers) {
        const ranked = parseSelectedIds(a.selectedOptionIds);
        if (ranked.length !== n) continue;
        answerCount += 1;
        ranked.forEach((id, idx) => {
          if (id in sumsRank) sumsRank[id] += idx + 1;
        });
        if (useTiers) {
          for (let i = 0; i < n; i++) {
            const id = ranked[i]!;
            const counts = isJury ? true : ranked[i] === expectedIds[i];
            if (counts && id in sumsAvgScore) {
              const pts = tiers![i] ?? 0;
              sumsAvgScore[id] += pts;
              sumsTotalScore[id] += pts;
            }
          }
        }
      }
      optionStats = sortedOpts.map((o) => ({
        optionId: o.id,
        text: o.text,
        count: answerCount,
        isCorrect: o.isCorrect,
        avgRank: answerCount > 0 ? sumsRank[o.id]! / answerCount : 0,
        avgScore: useTiers && answerCount > 0 ? sumsAvgScore[o.id]! / answerCount : undefined,
        totalScore: useTiers ? sumsTotalScore[o.id]! : undefined,
      }));
    } else {
      const optionCounts: Record<string, number> = {};
      sortedOpts.forEach((o) => {
        optionCounts[o.id] = 0;
      });
      if (q.type !== QuestionType.TAG_CLOUD) {
        q.answers.forEach((a) => {
          const selected = parseSelectedIds(a.selectedOptionIds);
          selected.forEach((id) => {
            if (id in optionCounts) optionCounts[id] += 1;
          });
        });
      }
      optionStats = sortedOpts.map((o) => ({
        optionId: o.id,
        text: o.text,
        count: optionCounts[o.id] ?? 0,
        isCorrect: o.isCorrect,
      }));
    }

    return {
      questionId: q.id,
      text: q.text,
      subQuizId: q.subQuizId,
      projectorShowFirstCorrect: q.projectorShowFirstCorrect,
      projectorFirstCorrectWinnersCount: q.projectorFirstCorrectWinnersCount,
      type: prismaTypeToApi(q.type),
      rankingProjectorMetric:
        q.type === QuestionType.RANKING ? rankingMetricToApi(q.rankingProjectorMetric) : undefined,
      rankingKind: q.type === QuestionType.RANKING ? rankingKindToApi(q.rankingKind) : undefined,
      optionStats,
      tagCloud,
      firstCorrectNicknames: [] as string[],
    };
  });
}

async function firstCorrectNicknamesForStandaloneQuestions(
  quizId: string,
): Promise<Map<string, string[]>> {
  const answers = await prisma.answer.findMany({
    where: {
      quizId,
      isCorrect: true,
      question: {
        subQuizId: null,
        type: {
          in: [
            QuestionType.SINGLE,
            QuestionType.MULTI,
            QuestionType.TAG_CLOUD,
            QuestionType.RANKING,
          ],
        },
      },
    },
    select: {
      questionId: true,
      submittedAt: true,
      participant: { select: { nickname: true } },
    },
    orderBy: { submittedAt: "asc" },
  });
  const map = new Map<string, string[]>();
  for (const a of answers) {
    const list = map.get(a.questionId) ?? [];
    if (list.length >= DASHBOARD_FIRST_CORRECT_CAP) continue;
    list.push(a.participant.nickname);
    map.set(a.questionId, list);
  }
  return map;
}

/** Один запрос вместо N× getLeaderboardForSubQuiz. */
async function aggregateLeaderboardsBySubQuizForQuiz(
  quizId: string,
  subQuizzes: Array<{ id: string; title: string }>,
): Promise<
  Array<{
    subQuizId: string;
    title: string;
    rows: Array<{
      participantId: string;
      nickname: string;
      score: number;
      totalResponseMs: number;
    }>;
  }>
> {
  if (subQuizzes.length === 0) return [];
  const rows = await prisma.$queryRaw<
    Array<{
      subQuizId: string;
      participantId: string;
      nickname: string;
      score: bigint;
      totalResponseMs: bigint;
    }>
  >(Prisma.sql`
    SELECT q."subQuizId" AS "subQuizId",
           a."participantId" AS "participantId",
           p.nickname AS nickname,
           SUM(a."scoreAwarded")::bigint AS score,
           SUM(a."responseMs")::bigint AS "totalResponseMs"
    FROM "Answer" a
    INNER JOIN "Question" q ON q.id = a."questionId"
    INNER JOIN "Participant" p ON p.id = a."participantId"
    WHERE a."quizId" = ${quizId}
      AND q."subQuizId" IS NOT NULL
    GROUP BY q."subQuizId", a."participantId", p.nickname
  `);

  const bySub = new Map<
    string,
    Array<{ participantId: string; nickname: string; score: number; totalResponseMs: number }>
  >();
  for (const r of rows) {
    const list = bySub.get(r.subQuizId);
    const row = {
      participantId: r.participantId,
      nickname: r.nickname,
      score: Number(r.score),
      totalResponseMs: Number(r.totalResponseMs),
    };
    if (list) list.push(row);
    else bySub.set(r.subQuizId, [row]);
  }
  return subQuizzes.map((sq) => {
    const subRows = bySub.get(sq.id) ?? [];
    subRows.sort(
      (a, b) =>
        b.score - a.score ||
        a.totalResponseMs - b.totalResponseMs ||
        a.nickname.localeCompare(b.nickname, "ru"),
    );
    return { subQuizId: sq.id, title: sq.title, rows: subRows };
  });
}

export type SubQuizDetailedResults = {
  subQuizId: string;
  title: string;
  quizId: string;
  questions: Array<{
    questionId: string;
    text: string;
    order: number;
    points: number;
    scoringMode: "poll" | "quiz";
    type: "single" | "multi" | "tag_cloud" | "ranking";
    isActive: boolean;
  }>;
  rows: Array<{
    participantId: string;
    nickname: string;
    scoresByQuestionId: Record<string, number | null>;
    totalScore: number;
    totalResponseMs: number;
  }>;
};

/** Детальные баллы по вопросам сабквиза (по quizId, без поиска комнаты по slug). */
export async function getSubQuizDetailedResultsForQuiz(
  quizId: string,
  subQuizId: string,
): Promise<SubQuizDetailedResults | null> {
  const subQuiz = await prisma.subQuiz.findFirst({
    where: { id: subQuizId, quizId },
    select: { id: true, title: true, quizId: true },
  });
  if (!subQuiz) return null;

  const questions = await prisma.question.findMany({
    where: { subQuizId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      text: true,
      order: true,
      points: true,
      scoringMode: true,
      type: true,
      isActive: true,
    },
  });

  const participants = await prisma.participant.findMany({
    where: {
      quizId: subQuiz.quizId,
      answers: { some: { question: { subQuizId } } },
    },
    include: {
      answers: {
        where: { question: { subQuizId } },
        select: { questionId: true, scoreAwarded: true, responseMs: true },
      },
    },
  });

  const questionIds = questions.map((q) => q.id);
  const rows = participants
    .map((p) => {
      const scoresByQuestionId: Record<string, number | null> = {};
      for (const qid of questionIds) {
        const ans = p.answers.find((a) => a.questionId === qid);
        scoresByQuestionId[qid] = ans !== undefined ? ans.scoreAwarded : null;
      }
      const totalScore = p.answers.reduce((sum, a) => sum + a.scoreAwarded, 0);
      const totalResponseMs = p.answers.reduce((sum, a) => sum + a.responseMs, 0);
      return {
        participantId: p.id,
        nickname: p.nickname,
        scoresByQuestionId,
        totalScore,
        totalResponseMs,
      };
    })
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        a.totalResponseMs - b.totalResponseMs ||
        a.nickname.localeCompare(b.nickname, "ru"),
    );

  return {
    subQuizId: subQuiz.id,
    title: subQuiz.title,
    quizId: subQuiz.quizId,
    questions: questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      order: q.order,
      points: q.points,
      scoringMode: q.scoringMode === ScoringMode.POLL ? "poll" : "quiz",
      type: prismaTypeToApi(q.type),
      isActive: q.isActive,
    })),
    rows,
  };
}

function filterSubQuizDetailedForReportQuestions(
  detailed: SubQuizDetailedResults,
  allowedQuestionIds: Set<string>,
): SubQuizDetailedResults | null {
  const questions = detailed.questions.filter((q) => allowedQuestionIds.has(q.questionId));
  if (questions.length === 0) return null;
  const qids = questions.map((q) => q.questionId);
  const rows = detailed.rows
    .map((row) => {
      const scoresByQuestionId: Record<string, number | null> = {};
      for (const qid of qids) {
        scoresByQuestionId[qid] = row.scoresByQuestionId[qid] ?? null;
      }
      const totalScore = qids.reduce((sum, qid) => {
        const v = scoresByQuestionId[qid];
        return sum + (v === null || v === undefined ? 0 : v);
      }, 0);
      return {
        participantId: row.participantId,
        nickname: row.nickname,
        scoresByQuestionId,
        totalScore,
        totalResponseMs: row.totalResponseMs,
      };
    })
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        a.totalResponseMs - b.totalResponseMs ||
        a.nickname.localeCompare(b.nickname, "ru"),
    );

  return {
    ...detailed,
    questions: questions.map((q) => ({ ...q, isActive: false })),
    rows,
  };
}

/** Детальные баллы по вопросам сабквиза (для админской страницы результатов). */
export async function getSubQuizDetailedResults(
  eventName: string,
  subQuizId: string,
): Promise<SubQuizDetailedResults | null> {
  const room = await prisma.quiz.findUnique({
    where: { slug: eventName },
    select: { id: true },
  });
  if (!room) return null;
  return getSubQuizDetailedResultsForQuiz(room.id, subQuizId);
}

export type DashboardResults = {
  perQuestion: ReturnType<typeof mapPerQuestion>;
  leaderboard: Array<{
    participantId: string;
    nickname: string;
    score: number;
    totalResponseMs: number;
  }>;
  leaderboardsBySubQuiz: Array<{
    subQuizId: string;
    title: string;
    rows: Array<{
      participantId: string;
      nickname: string;
      score: number;
      totalResponseMs: number;
    }>;
  }>;
};

export async function getDashboardResults(quizId: string): Promise<DashboardResults> {
  const [questions, subQuizzes] = await Promise.all([
    prisma.question.findMany({
      where: { quizId },
      select: {
        id: true,
        text: true,
        subQuizId: true,
        type: true,
        projectorShowFirstCorrect: true,
        projectorFirstCorrectWinnersCount: true,
        rankingPointsByRank: true,
        rankingProjectorMetric: true,
        rankingKind: true,
        options: { select: { id: true, text: true, isCorrect: true, sortOrder: true } },
        answers: { select: { selectedOptionIds: true } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.subQuiz.findMany({
      where: { quizId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  const leaderboardsBySubQuiz = await aggregateLeaderboardsBySubQuizForQuiz(quizId, subQuizzes);
  const leaderboard = leaderboardsBySubQuiz[0]?.rows ?? [];
  const firstCorrectMap = await firstCorrectNicknamesForStandaloneQuestions(quizId);
  const perQuestion = mapPerQuestion(questions).map((row) => {
    const nicks = row.subQuizId == null ? (firstCorrectMap.get(row.questionId) ?? []) : [];
    return { ...row, firstCorrectNicknames: nicks };
  });
  return {
    perQuestion,
    leaderboard,
    leaderboardsBySubQuiz,
  };
}

/** Совместимость: таблица вопросов + лидерборд первого квиза */
export async function getResults(quizId: string) {
  const dash = await getDashboardResults(quizId);
  return { perQuestion: dash.perQuestion, leaderboard: dash.leaderboard };
}

export async function getParticipantAnswersMap(quizId: string, participantId: string) {
  const answers = await prisma.answer.findMany({
    where: { quizId, participantId },
    select: {
      questionId: true,
      selectedOptionIds: true,
      question: {
        select: {
          type: true,
          options: { select: { id: true } },
        },
      },
    },
  });
  return answers.reduce<Record<string, string[]>>((acc, answer) => {
    if (!isStoredAnswerValidForQuestion(answer.question, answer.selectedOptionIds)) {
      return acc;
    }
    acc[answer.questionId] = parseSelectedIds(answer.selectedOptionIds);
    return acc;
  }, {});
}

export async function getQuizByAccess(slug: string, accessToken: string) {
  return prisma.quiz.findFirst({
    where: { slug, accessToken },
  });
}

export async function getQuizBySlug(slug: string) {
  return prisma.quiz.findUnique({
    where: { slug },
  });
}

export type PublicEventReport = {
  title: string;
  slug: string;
  generatedAt: string;
  branding: {
    brandPrimaryColor: string;
    brandAccentColor: string;
    brandSurfaceColor: string;
    brandTextColor: string;
    brandFontFamily: string;
    brandLogoUrl: string;
    brandProjectorBackgroundImageUrl: string;
    brandBodyBackgroundColor: string;
  };
  config: {
    reportTitle: string;
    reportModules: Array<
      | "event_header"
      | "participation_summary"
      | "quiz_results"
      | "vote_results"
      | "reactions_summary"
      | "randomizer_summary"
      | "speaker_questions_summary"
    >;
    reportVoteQuestionIds: string[];
    reportQuizQuestionIds: string[];
    reportQuizSubQuizIds: string[];
    reportPublished: boolean;
  };
  summary: {
    participantsCount: number;
    questionsCount: number;
    subQuizzesCount: number;
    answersCount: number;
  };
  leaderboard: DashboardResults["leaderboard"];
  quizQuestions: Array<
    DashboardResults["perQuestion"][number] & {
      subQuizTitle?: string;
    }
  >;
  voteQuestions: Array<
    DashboardResults["perQuestion"][number] & {
      subQuizTitle?: string;
    }
  >;
  randomizer: {
    currentWinners: string[];
    history: Array<{ timestamp: string; winners: string[]; mode: "names" | "numbers" }>;
  };
  reactions: {
    overlayText: string;
    widgets: Array<{
      id: string;
      title: string;
      reactions: string[];
      reactionStats: Array<{ reaction: string; count: number }>;
    }>;
  };
  speakerQuestions: {
    enabled: boolean;
    total: number;
    onScreen: number;
    items: Array<{
      id: string;
      speakerName: string;
      text: string;
      author: string;
      reactions: Array<{ reaction: string; count: number }>;
    }>;
  };
  /** Таблицы результатов по участникам (только для субквизов без флага скрытия в настройках отчёта). */
  subQuizParticipantTables: SubQuizDetailedResults[];
};

function buildReportRandomizerSubset(view: PublicViewState): {
  currentWinners: string[];
  history: PublicViewState["randomizerHistory"];
} {
  const allHistory = view.randomizerHistory;
  const allCurrent = view.randomizerCurrentWinners;
  const ids = view.reportRandomizerRunIds;
  if (!ids || ids.length === 0) {
    return { currentWinners: [...allCurrent], history: [...allHistory] };
  }
  const wantCurrent = ids.includes("current");
  const indexSet = new Set(
    ids
      .filter((id) => id.startsWith("history:"))
      .map((id) => Number.parseInt(id.slice("history:".length), 10))
      .filter((n) => Number.isFinite(n) && n >= 0 && n < allHistory.length),
  );
  const history = allHistory.filter((_, i) => indexSet.has(i));
  return { currentWinners: wantCurrent ? [...allCurrent] : [], history };
}

export async function getPublicReportBySlug(slug: string): Promise<PublicEventReport | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      publicView: true,
    },
  });
  if (!quiz) return null;
  const view = publicViewJsonToState(quiz.publicView);
  if (!view.reportPublished) return null;

  const [dash, participantsCount, answersCount, speakerStats, speakerItemsRaw] = await Promise.all([
    getDashboardResults(quiz.id),
    prisma.participant.count({ where: { quizId: quiz.id } }),
    prisma.answer.count({ where: { quizId: quiz.id } }),
    prisma.speakerQuestion.groupBy({
      by: ["isOnScreen"],
      where: { quizId: quiz.id },
      _count: { _all: true },
    }),
    prisma.speakerQuestion.findMany({
      where: { quizId: quiz.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        speakerName: true,
        text: true,
        participant: { select: { nickname: true } },
        reactions: { select: { reaction: true } },
      },
    }),
  ]);

  const onScreen = speakerStats.find((row) => row.isOnScreen)?._count._all ?? 0;
  const total = speakerStats.reduce((sum, row) => sum + row._count._all, 0);
  const reactionSession = getReactionSessionPublic(quiz.id);
  const latestReactionCounts =
    reactionSession?.counts ??
    reactionSession?.history[0]?.counts ??
    ({} as Record<string, number>);

  const voteQuestionIdSet = new Set(view.reportVoteQuestionIds);
  const quizQuestionIdSet = new Set(view.reportQuizQuestionIds);
  const quizSubQuizIdSet = new Set(view.reportQuizSubQuizIds);
  const subQuizTitleById = new Map(
    dash.leaderboardsBySubQuiz.map((row) => [row.subQuizId, row.title] as const),
  );
  const quizQuestions = dash.perQuestion.filter((row) => {
    if (row.subQuizId == null) return false;
    if (quizQuestionIdSet.size > 0) return quizQuestionIdSet.has(row.questionId);
    if (quizSubQuizIdSet.size === 0) return true;
    return quizSubQuizIdSet.has(row.subQuizId);
  });
  const voteQuestions = dash.perQuestion.filter((row) => {
    if (row.subQuizId != null) return false;
    if (voteQuestionIdSet.size === 0) return true;
    return voteQuestionIdSet.has(row.questionId);
  });
  const speakerItems = speakerItemsRaw.map((item) => {
    const reactionCountByValue = new Map<string, number>();
    for (const reaction of item.reactions) {
      reactionCountByValue.set(
        reaction.reaction,
        (reactionCountByValue.get(reaction.reaction) ?? 0) + 1,
      );
    }
    return {
      id: item.id,
      speakerName: item.speakerName,
      text: item.text,
      author: item.participant.nickname,
      reactions: Array.from(reactionCountByValue.entries()).map(([reaction, count]) => ({
        reaction,
        count,
      })),
    };
  });

  const hideParticipantTableSet = new Set(view.reportSubQuizHideParticipantTableIds);
  const quizQuestionIdsBySubQuiz = new Map<string, Set<string>>();
  for (const row of quizQuestions) {
    if (row.subQuizId == null) continue;
    let idSet = quizQuestionIdsBySubQuiz.get(row.subQuizId);
    if (!idSet) {
      idSet = new Set();
      quizQuestionIdsBySubQuiz.set(row.subQuizId, idSet);
    }
    idSet.add(row.questionId);
  }

  const orderedSubQuizIdsForTables = dash.leaderboardsBySubQuiz
    .map((row) => row.subQuizId)
    .filter((id) => {
      const set = quizQuestionIdsBySubQuiz.get(id);
      return Boolean(set && set.size > 0 && !hideParticipantTableSet.has(id));
    });

  const subQuizParticipantTablesRaw = await Promise.all(
    orderedSubQuizIdsForTables.map((sid) => getSubQuizDetailedResultsForQuiz(quiz.id, sid)),
  );
  const subQuizParticipantTables: SubQuizDetailedResults[] = [];
  for (let i = 0; i < orderedSubQuizIdsForTables.length; i++) {
    const sid = orderedSubQuizIdsForTables[i]!;
    const detailed = subQuizParticipantTablesRaw[i];
    if (!detailed) continue;
    const allowed = quizQuestionIdsBySubQuiz.get(sid);
    if (!allowed || allowed.size === 0) continue;
    const filtered = filterSubQuizDetailedForReportQuestions(detailed, allowed);
    if (filtered) subQuizParticipantTables.push(filtered);
  }

  return {
    title: quiz.title,
    slug: quiz.slug,
    generatedAt: new Date().toISOString(),
    branding: {
      brandPrimaryColor: view.brandPrimaryColor,
      brandAccentColor: view.brandAccentColor,
      brandSurfaceColor: view.brandSurfaceColor,
      brandTextColor: view.brandTextColor,
      brandFontFamily: view.brandFontFamily,
      brandLogoUrl: view.brandLogoUrl,
      brandProjectorBackgroundImageUrl: view.brandProjectorBackgroundImageUrl,
      brandBodyBackgroundColor: view.brandBodyBackgroundColor,
    },
    config: {
      reportTitle: view.reportTitle,
      reportModules: view.reportModules,
      reportVoteQuestionIds: view.reportVoteQuestionIds,
      reportQuizQuestionIds: view.reportQuizQuestionIds,
      reportQuizSubQuizIds: view.reportQuizSubQuizIds,
      reportPublished: view.reportPublished,
    },
    summary: {
      participantsCount,
      questionsCount: dash.perQuestion.length,
      subQuizzesCount: dash.leaderboardsBySubQuiz.length,
      answersCount,
    },
    leaderboard: dash.leaderboard.slice(0, 200),
    quizQuestions: quizQuestions.slice(0, 500).map((row) => ({
      ...row,
      subQuizTitle: row.subQuizId ? (subQuizTitleById.get(row.subQuizId) ?? undefined) : undefined,
    })),
    voteQuestions: voteQuestions.slice(0, 500).map((row) => ({
      ...row,
      subQuizTitle: row.subQuizId ? (subQuizTitleById.get(row.subQuizId) ?? undefined) : undefined,
    })),
    randomizer: (() => {
      const r = buildReportRandomizerSubset(view);
      return { currentWinners: r.currentWinners, history: r.history };
    })(),
    reactions: {
      overlayText: view.reactionsOverlayText,
      widgets: (() => {
        const persistedStatsByWidget = new Map(
          view.reactionsWidgetStats.map((row) => [row.widgetId, row.counts] as const),
        );
        const normalizedOverlay = view.reactionsOverlayText.trim();
        const activeWidgetIndex = view.reactionsWidgets.findIndex(
          (widget) => widget.title.trim() === normalizedOverlay,
        );
        const widgetSet =
          view.reportReactionsWidgetIds.length > 0 ? new Set(view.reportReactionsWidgetIds) : null;
        return view.reactionsWidgets
          .map((widget, originalIndex) => ({ widget, originalIndex }))
          .filter(({ widget }) => widgetSet === null || widgetSet.has(widget.id))
          .map(({ widget, originalIndex }) => {
            const isActiveWidget =
              activeWidgetIndex >= 0
                ? originalIndex === activeWidgetIndex
                : view.reactionsWidgets.length === 1;
            return {
              ...widget,
              reactionStats: widget.reactions.map((reaction) => ({
                reaction,
                count: isActiveWidget
                  ? (latestReactionCounts[reaction] ??
                    persistedStatsByWidget.get(widget.id)?.[reaction] ??
                    0)
                  : (persistedStatsByWidget.get(widget.id)?.[reaction] ?? 0),
              })),
            };
          });
      })(),
    },
    speakerQuestions: (() => {
      const qSet =
        view.reportSpeakerQuestionIds.length > 0 ? new Set(view.reportSpeakerQuestionIds) : null;
      const items = qSet === null ? speakerItems : speakerItems.filter((item) => qSet.has(item.id));
      return {
        enabled: view.speakerQuestionsEnabled,
        total: items.length,
        onScreen,
        items,
      };
    })(),
    subQuizParticipantTables,
  };
}

export async function activateNextQuestion(quizId: string, subQuizId?: string) {
  const sq = subQuizId
    ? await prisma.subQuiz.findFirst({ where: { id: subQuizId, quizId } })
    : await prisma.subQuiz.findFirst({ where: { quizId }, orderBy: { sortOrder: "asc" } });
  if (!sq) throw new Error("SubQuiz not found");
  const questions = await prisma.question.findMany({
    where: { subQuizId: sq.id },
    orderBy: { order: "asc" },
  });
  const nextQuestion = questions[sq.currentQuestionIndex];
  if (!nextQuestion) throw new Error("No more questions");

  await prisma.$transaction([
    prisma.question.updateMany({
      where: { quizId },
      data: { isActive: false },
    }),
    prisma.question.update({
      where: { id: nextQuestion.id },
      data: { isActive: true, isClosed: false, activatedAt: new Date() },
    }),
    prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.LIVE },
    }),
  ]);

  return getQuizPublicState(quizId);
}

export async function closeQuestion(quizId: string, questionId: string) {
  const q = await prisma.question.findFirst({ where: { id: questionId, quizId } });
  if (!q) throw new Error("Question not found");
  await prisma.question.updateMany({
    where: { id: questionId, quizId },
    data: { isClosed: true, isActive: false },
  });
  if (q.subQuizId) {
    await prisma.subQuiz.update({
      where: { id: q.subQuizId },
      data: { currentQuestionIndex: { increment: 1 } },
    });
  }
  return getDashboardResults(quizId);
}

export async function setQuestionEnabled(quizId: string, questionId: string, enabled: boolean) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId },
  });
  if (!question) throw new Error("Question not found");

  if (enabled) {
    await prisma.$transaction([
      prisma.question.update({
        where: { id: questionId },
        data: { isActive: true, isClosed: false, activatedAt: new Date() },
      }),
      prisma.quiz.update({
        where: { id: quizId },
        data: { status: QuizStatus.LIVE },
      }),
    ]);
    if (question.subQuizId) {
      const ordered = await prisma.question.findMany({
        where: { subQuizId: question.subQuizId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const idx = ordered.findIndex((x) => x.id === questionId);
      if (idx >= 0) {
        await prisma.subQuiz.update({
          where: { id: question.subQuizId },
          data: { currentQuestionIndex: idx },
        });
      }
    }
  } else {
    await prisma.question.update({
      where: { id: questionId },
      data: { isActive: false, isClosed: true },
    });
  }

  return getQuizPublicState(quizId);
}

export async function finishQuiz(quizId: string) {
  await prisma.$transaction([
    prisma.question.updateMany({
      where: { quizId, isActive: true },
      data: { isActive: false, isClosed: true },
    }),
    prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.FINISHED },
    }),
  ]);
  return getQuizPublicState(quizId);
}

/** Все вопросы сабквиза снимаются с экрана (isActive: false, isClosed: true). Статус комнаты Quiz не меняется. */
export async function closeSubQuiz(quizId: string, subQuizId: string) {
  const sq = await prisma.subQuiz.findFirst({ where: { id: subQuizId, quizId } });
  if (!sq) throw new Error("SubQuiz not found");
  await prisma.question.updateMany({
    where: { quizId, subQuizId },
    data: { isActive: false, isClosed: true },
  });
  return getQuizPublicState(quizId);
}

export async function startSubQuizAuto(quizId: string, subQuizId: string) {
  const sq = await prisma.subQuiz.findFirst({ where: { id: subQuizId, quizId } });
  if (!sq) throw new Error("SubQuiz not found");
  await prisma.$transaction([
    prisma.question.updateMany({
      where: { quizId },
      data: { isActive: false, isClosed: true },
    }),
    prisma.question.updateMany({
      where: { quizId, subQuizId },
      data: { isActive: true, isClosed: false, activatedAt: new Date() },
    }),
    prisma.subQuiz.update({
      where: { id: subQuizId },
      data: { currentQuestionIndex: 0 },
    }),
    prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.LIVE },
    }),
  ]);
  return getQuizPublicState(quizId);
}

export async function joinQuiz(payload: { slug: string; nickname: string; deviceId: string }) {
  let nickname = payload.nickname.trim();
  if (containsProfanity(nickname)) {
    nickname = "Участник";
  }
  const quiz = await prisma.quiz.findUnique({
    where: { slug: payload.slug },
  });
  if (!quiz) throw new Error("Quiz not found");
  const currentParticipant = await prisma.participant.findUnique({
    where: {
      quizId_deviceId: { quizId: quiz.id, deviceId: payload.deviceId },
    },
    select: { id: true },
  });
  const duplicateNickname = await prisma.participant.findFirst({
    where: {
      quizId: quiz.id,
      nickname: {
        equals: nickname,
        mode: "insensitive",
      },
      ...(currentParticipant ? { NOT: { id: currentParticipant.id } } : {}),
    },
    select: { id: true },
  });
  if (duplicateNickname) {
    throw new Error("Ник уже используется в этой комнате");
  }
  const participant = await prisma.participant.upsert({
    where: {
      quizId_deviceId: { quizId: quiz.id, deviceId: payload.deviceId },
    },
    create: {
      quizId: quiz.id,
      deviceId: payload.deviceId,
      nickname,
    },
    update: {
      nickname,
    },
  });
  return { quizId: quiz.id, participantId: participant.id };
}

export async function updateParticipantNickname(payload: {
  quizId: string;
  participantId: string;
  nickname: string;
}) {
  let nickname = payload.nickname.trim();
  if (containsProfanity(nickname)) {
    nickname = "Участник";
  }
  const currentParticipant = await prisma.participant.findFirst({
    where: { id: payload.participantId, quizId: payload.quizId },
    select: { id: true },
  });
  if (!currentParticipant) throw new Error("Participant not found");
  const duplicateNickname = await prisma.participant.findFirst({
    where: {
      quizId: payload.quizId,
      nickname: {
        equals: nickname,
        mode: "insensitive",
      },
      NOT: { id: payload.participantId },
    },
    select: { id: true },
  });
  if (duplicateNickname) {
    throw new Error("Ник уже используется в этой комнате");
  }
  await prisma.participant.update({
    where: { id: payload.participantId },
    data: { nickname },
  });
  return { nickname };
}

export async function submitAnswer(payload: {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  rankedOptionIds?: string[];
  tagAnswers?: string[];
  participantId: string;
}) {
  const participant = await prisma.participant.findFirst({
    where: { id: payload.participantId, quizId: payload.quizId },
    select: { id: true },
  });
  if (!participant) {
    throw new Error("Participant not found");
  }
  const question = await prisma.question.findFirst({
    where: { id: payload.questionId, quizId: payload.quizId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!question) throw new Error("Question not found");
  if (!question.isActive || question.isClosed) throw new Error("Question is not open");

  const existing = await prisma.answer.findUnique({
    where: {
      questionId_participantId: {
        questionId: payload.questionId,
        participantId: payload.participantId,
      },
    },
  });
  if (existing) {
    if (isStoredAnswerValidForQuestion(question, existing.selectedOptionIds)) {
      throw new Error("Already answered this question");
    }
    await prisma.answer.delete({
      where: {
        questionId_participantId: {
          questionId: payload.questionId,
          participantId: payload.participantId,
        },
      },
    });
  }

  const nowMs = Date.now();
  const activatedAtMs = question.activatedAt?.getTime() ?? nowMs;
  const responseMs = Math.max(0, nowMs - activatedAtMs);

  if (question.type === QuestionType.RANKING) {
    const ranked = payload.rankedOptionIds ?? [];
    const expectedIds = rankingExpectedIdsFromQuestion(
      question.options,
      question.rankingKind,
      question.rankingPointsByRank,
    );
    const expectedSet = new Set(expectedIds);
    if (ranked.length !== expectedIds.length) {
      throw new Error("Ranking must list each option exactly once");
    }
    if (new Set(ranked).size !== ranked.length) {
      throw new Error("Duplicate options in ranking");
    }
    for (const id of ranked) {
      if (!expectedSet.has(id)) throw new Error("Invalid option id in ranking");
    }
    const tiers = parseRankingTiersJson(question.rankingPointsByRank);
    const useTiers = tiers != null && tiers.length === expectedIds.length;

    if (question.rankingKind === RankingKind.JURY) {
      if (!useTiers) {
        throw new Error("Jury ranking requires points for each rank");
      }
      await prisma.answer.create({
        data: {
          quizId: payload.quizId,
          questionId: payload.questionId,
          participantId: payload.participantId,
          selectedOptionIds: JSON.stringify(ranked),
          isCorrect: false,
          scoreAwarded: 0,
          responseMs,
        },
      });
      return;
    }

    const isCorrect =
      question.scoringMode === ScoringMode.QUIZ && evaluateRankingAnswer(expectedIds, ranked);
    const scoreAwarded =
      question.scoringMode === ScoringMode.QUIZ && isCorrect ? question.points : 0;
    await prisma.answer.create({
      data: {
        quizId: payload.quizId,
        questionId: payload.questionId,
        participantId: payload.participantId,
        selectedOptionIds: JSON.stringify(ranked),
        isCorrect,
        scoreAwarded,
        responseMs,
      },
    });
    return;
  }

  const rawTagAnswers = payload.tagAnswers ?? [];
  const tagAnswersForScore = rawTagAnswers.filter((t) => !containsProfanity(t));

  const selected = [...new Set(payload.optionIds ?? [])].sort();
  const tagCloudQuiz =
    question.type === QuestionType.TAG_CLOUD && question.scoringMode === ScoringMode.QUIZ;
  const tagCloudPollWithReference =
    question.type === QuestionType.TAG_CLOUD &&
    question.scoringMode === ScoringMode.POLL &&
    question.options.some((o) => o.isCorrect);
  const useComparableTagCloud = tagCloudQuiz || tagCloudPollWithReference;
  const normalizedTags = tagAnswersForScore
    .map(useComparableTagCloud ? normalizeTagComparable : normalizeTag)
    .filter(Boolean);
  if (question.type === QuestionType.TAG_CLOUD) {
    if (normalizedTags.length < 1) {
      if (rawTagAnswers.length < 1) {
        throw new Error("At least one tag is required");
      }
    }
    if (normalizedTags.length > Math.max(1, question.maxAnswers)) {
      throw new Error(`Too many tags: max ${question.maxAnswers}`);
    }
  } else if (selected.length < 1) {
    throw new Error("At least one option is required");
  }
  const isCorrect =
    question.type === QuestionType.TAG_CLOUD
      ? tagCloudQuiz || tagCloudPollWithReference
        ? evaluateTagCloudQuizAnswer(question as QuestionWithOptions, normalizedTags)
        : false
      : evaluateAnswer(question as QuestionWithOptions, selected);
  const quizScoring = question.scoringMode === ScoringMode.QUIZ;
  const scoreAwarded = quizScoring && isCorrect ? question.points : 0;

  await prisma.answer.create({
    data: {
      quizId: payload.quizId,
      questionId: payload.questionId,
      participantId: payload.participantId,
      selectedOptionIds: JSON.stringify(
        question.type === QuestionType.TAG_CLOUD ? normalizedTags : selected,
      ),
      isCorrect,
      scoreAwarded,
      responseMs,
    },
  });
}

export async function resetParticipantAnswers(quizId: string, participantId: string) {
  await prisma.answer.deleteMany({
    where: { quizId, participantId },
  });
  return getDashboardResults(quizId);
}

export async function resetQuestionAnswers(quizId: string, questionId: string) {
  await prisma.answer.deleteMany({
    where: { quizId, questionId },
  });
  return getDashboardResults(quizId);
}

export async function resetAllQuizAnswers(quizId: string) {
  await prisma.answer.deleteMany({
    where: { quizId },
  });
  return getDashboardResults(quizId);
}

export type StandaloneVoteAdminDetail = {
  question: {
    id: string;
    text: string;
    type: "single" | "multi" | "tag_cloud" | "ranking";
    rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
    rankingKind?: "quiz" | "jury";
  };
  firstCorrect: null | { participantId: string; nickname: string; submittedAt: string };
  optionStats: Array<{
    optionId: string;
    text: string;
    count: number;
    isCorrect: boolean;
    avgRank?: number;
    avgScore?: number;
    totalScore?: number;
  }>;
  tagCloud: Array<{ text: string; count: number }>;
  answerRows: Array<{
    participantId: string;
    nickname: string;
    submittedAt: string;
    labels: string[];
    isCorrect: boolean;
  }>;
};

export async function getStandaloneVoteAdminDetail(
  eventName: string,
  questionId: string,
): Promise<StandaloneVoteAdminDetail | null> {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName } });
  if (!room) return null;
  const q = await prisma.question.findFirst({
    where: { id: questionId, quizId: room.id, subQuizId: null },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!q) return null;

  const answers = await prisma.answer.findMany({
    where: { questionId },
    include: { participant: true },
    orderBy: { submittedAt: "asc" },
  });

  const optionById = Object.fromEntries(q.options.map((o) => [o.id, o.text]));
  const correctOptionCount = q.options.filter((o) => o.isCorrect).length;

  let firstCorrect: StandaloneVoteAdminDetail["firstCorrect"] = null;
  if (
    (q.type === QuestionType.SINGLE && correctOptionCount === 1) ||
    (q.type === QuestionType.RANKING && q.rankingKind === RankingKind.QUIZ)
  ) {
    const hit = answers.find((a) => a.isCorrect);
    if (hit) {
      firstCorrect = {
        participantId: hit.participant.id,
        nickname: hit.participant.nickname,
        submittedAt: hit.submittedAt.toISOString(),
      };
    }
  }

  const sortedOpts = [...q.options].sort((a, b) => a.sortOrder - b.sortOrder);
  let optionStats: StandaloneVoteAdminDetail["optionStats"];
  if (q.type === QuestionType.RANKING) {
    const n = sortedOpts.length;
    const expectedIds = sortedOpts.map((o) => o.id);
    const isJury = q.rankingKind === RankingKind.JURY;
    const tiers = parseRankingTiersJson(q.rankingPointsByRank);
    const useTiers = isJury && tiers != null && tiers.length === n;
    const sumsRank: Record<string, number> = {};
    const sumsAvgScore: Record<string, number> = {};
    const sumsTotalScore: Record<string, number> = {};
    sortedOpts.forEach((o) => {
      sumsRank[o.id] = 0;
      sumsAvgScore[o.id] = 0;
      sumsTotalScore[o.id] = 0;
    });
    let answerCount = 0;
    for (const a of answers) {
      const ranked = parseSelectedIds(a.selectedOptionIds);
      if (ranked.length !== n) continue;
      answerCount += 1;
      ranked.forEach((id, idx) => {
        if (id in sumsRank) sumsRank[id] += idx + 1;
      });
      if (useTiers) {
        for (let i = 0; i < n; i++) {
          const id = ranked[i]!;
          const ok = isJury || ranked[i] === expectedIds[i];
          if (ok && id in sumsAvgScore) {
            const pts = tiers![i] ?? 0;
            sumsAvgScore[id] += pts;
            sumsTotalScore[id] += pts;
          }
        }
      }
    }
    optionStats = sortedOpts.map((o) => ({
      optionId: o.id,
      text: o.text,
      count: answerCount,
      isCorrect: o.isCorrect,
      avgRank: answerCount > 0 ? sumsRank[o.id]! / answerCount : 0,
      avgScore: useTiers && answerCount > 0 ? sumsAvgScore[o.id]! / answerCount : undefined,
      totalScore: useTiers ? sumsTotalScore[o.id]! : undefined,
    }));
  } else {
    const optionCounts: Record<string, number> = {};
    sortedOpts.forEach((o) => {
      optionCounts[o.id] = 0;
    });
    answers.forEach((a) => {
      parseSelectedIds(a.selectedOptionIds).forEach((id) => {
        if (id in optionCounts) optionCounts[id] += 1;
      });
    });
    optionStats = sortedOpts.map((o) => ({
      optionId: o.id,
      text: o.text,
      count: optionCounts[o.id] ?? 0,
      isCorrect: o.isCorrect,
    }));
  }

  const tagCloud =
    q.type === QuestionType.TAG_CLOUD
      ? Object.entries(
          answers.reduce<Record<string, number>>((acc, answer) => {
            parseTagAnswers(answer.selectedOptionIds).forEach((tag) => {
              acc[tag] = (acc[tag] ?? 0) + 1;
            });
            return acc;
          }, {}),
        )
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"))
      : [];

  const answerRows = answers.map((a) => {
    const ids = parseSelectedIds(a.selectedOptionIds);
    const labels =
      q.type === QuestionType.TAG_CLOUD
        ? parseTagAnswers(a.selectedOptionIds)
        : ids.map((id) => optionById[id] ?? id);
    return {
      participantId: a.participant.id,
      nickname: a.participant.nickname,
      submittedAt: a.submittedAt.toISOString(),
      labels,
      isCorrect: a.isCorrect,
    };
  });

  return {
    question: {
      id: q.id,
      text: q.text,
      type: prismaTypeToApi(q.type),
      rankingProjectorMetric:
        q.type === QuestionType.RANKING ? rankingMetricToApi(q.rankingProjectorMetric) : undefined,
      rankingKind: q.type === QuestionType.RANKING ? rankingKindToApi(q.rankingKind) : undefined,
    },
    firstCorrect,
    optionStats,
    tagCloud,
    answerRows,
  };
}
