import { Prisma, QuestionType, QuizStatus, ScoringMode } from "@prisma/client";
import { prisma } from "./prisma.js";
import { parseSelectedIds, randomSlug, randomToken } from "./utils.js";
import { evaluateAnswer } from "./scoring.js";

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

function normalizeTag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
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
    options: { select: { id: true; text: true; isCorrect: true } };
    answers: { select: { selectedOptionIds: true } };
  };
}>;

export type QuestionReplaceInput = {
  text: string;
  type: "single" | "multi" | "tag_cloud";
  points: number;
  maxAnswers?: number;
  scoringMode?: "poll" | "quiz";
  /** Показывать победителей на проекторе для этого вопроса (вместе с глобальной настройкой комнаты). */
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  options: Array<{ text: string; isCorrect: boolean }>;
};

export type SubQuizReplaceInput = {
  title: string;
  sortOrder?: number;
  questions: QuestionReplaceInput[];
};

export type RoomContentReplaceInput = {
  subQuizzes: SubQuizReplaceInput[];
  standaloneQuestions: QuestionReplaceInput[];
};

function toScoringMode(q: QuestionReplaceInput): ScoringMode {
  if (q.type === "tag_cloud") return ScoringMode.POLL;
  return q.scoringMode === "poll" ? ScoringMode.POLL : ScoringMode.QUIZ;
}

export async function createQuiz(input: {
  title: string;
  questions: Array<{
    text: string;
    type: "single" | "multi" | "tag_cloud";
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
    const q = input.questions[index];
    const mode = q.type === "tag_cloud" ? ScoringMode.POLL : ScoringMode.QUIZ;
    const createdQ = await prisma.question.create({
      data: {
        quizId: quiz.id,
        subQuizId: sub.id,
        text: q.text,
        type:
          q.type === "single"
            ? QuestionType.SINGLE
            : q.type === "multi"
              ? QuestionType.MULTI
              : QuestionType.TAG_CLOUD,
        order: index,
        points: q.type === "tag_cloud" ? 1 : q.points,
        maxAnswers: q.type === "tag_cloud" ? (q.maxAnswers ?? 3) : 1,
        scoringMode: mode,
      },
    });
    if (q.type !== "tag_cloud") {
      await prisma.option.createMany({
        data: q.options.map((o) => ({
          questionId: createdQ.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      });
    }
  }
  return prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: {
      subQuizzes: true,
      questions: { include: { options: true }, orderBy: { order: "asc" } },
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
  questions: { include: { options: true }, orderBy: { order: "asc" as const } },
} satisfies Prisma.QuizInclude;

export async function getRoomByEventName(eventName: string) {
  return prisma.quiz.findUnique({
    where: { slug: eventName },
    include: roomInclude,
  });
}

export async function updateRoomTitle(eventName: string, title: string) {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName } });
  if (!room) throw new Error("Room not found");
  const titleKey = title.trim().toLowerCase();
  const allRooms = await prisma.quiz.findMany({
    where: { NOT: { id: room.id } },
    select: { title: true },
  });
  const hasDuplicateTitle = allRooms.some((item) => item.title.trim().toLowerCase() === titleKey);
  if (hasDuplicateTitle) throw new Error("Room title already exists");
  return prisma.quiz.update({
    where: { id: room.id },
    data: { title },
  });
}

export async function replaceRoomContent(eventName: string, content: RoomContentReplaceInput) {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName } });
  if (!room) throw new Error("Room not found");
  await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { quizId: room.id } });
    await tx.subQuiz.deleteMany({ where: { quizId: room.id } });
    const subRows: { id: string; sortOrder: number }[] = [];
    let sortBase = 0;
    for (const sq of content.subQuizzes) {
      const createdSq = await tx.subQuiz.create({
        data: {
          quizId: room.id,
          title: sq.title,
          sortOrder: sq.sortOrder ?? sortBase,
        },
      });
      subRows.push({ id: createdSq.id, sortOrder: createdSq.sortOrder });
      sortBase += 1;
      for (let i = 0; i < sq.questions.length; i += 1) {
        const q = sq.questions[i];
        const mode = toScoringMode(q);
        const createdQ = await tx.question.create({
          data: {
            quizId: room.id,
            subQuizId: createdSq.id,
            text: q.text,
            type:
              q.type === "single"
                ? QuestionType.SINGLE
                : q.type === "multi"
                  ? QuestionType.MULTI
                  : QuestionType.TAG_CLOUD,
            order: i,
            points: q.type === "tag_cloud" ? 1 : q.points,
            maxAnswers: q.type === "tag_cloud" ? (q.maxAnswers ?? 3) : 1,
            scoringMode: mode,
            projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
            projectorFirstCorrectWinnersCount: Math.max(
              1,
              Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
            ),
          },
        });
        if (q.type !== "tag_cloud") {
          await tx.option.createMany({
            data: q.options.map((o) => ({
              questionId: createdQ.id,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          });
        }
      }
    }
    for (let i = 0; i < content.standaloneQuestions.length; i += 1) {
      const q = content.standaloneQuestions[i];
      const mode = toScoringMode(q);
      const createdQ = await tx.question.create({
        data: {
          quizId: room.id,
          subQuizId: null,
          text: q.text,
          type:
            q.type === "single"
              ? QuestionType.SINGLE
              : q.type === "multi"
                ? QuestionType.MULTI
                : QuestionType.TAG_CLOUD,
          order: i,
          points: q.type === "tag_cloud" ? 1 : q.points,
          maxAnswers: q.type === "tag_cloud" ? (q.maxAnswers ?? 3) : 1,
          scoringMode: mode,
          projectorShowFirstCorrect: q.projectorShowFirstCorrect ?? true,
          projectorFirstCorrectWinnersCount: Math.max(
            1,
            Math.min(20, Math.trunc(q.projectorFirstCorrectWinnersCount ?? 1)),
          ),
        },
      });
      if (q.type !== "tag_cloud") {
        await tx.option.createMany({
          data: q.options.map((o) => ({
            questionId: createdQ.id,
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        });
      }
    }
  });
  return getRoomByEventName(eventName);
}

export async function patchQuestionProjectorSettings(
  eventName: string,
  questionId: string,
  patch: { projectorShowFirstCorrect?: boolean; projectorFirstCorrectWinnersCount?: number },
): Promise<void> {
  const room = await prisma.quiz.findUnique({ where: { slug: eventName }, select: { id: true } });
  if (!room) throw new Error("Room not found");
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId: room.id },
    select: { id: true },
  });
  if (!question) throw new Error("Question not found");

  const data: {
    projectorShowFirstCorrect?: boolean;
    projectorFirstCorrectWinnersCount?: number;
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
    type: "single" | "multi" | "tag_cloud";
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
  index: number;
  total: number;
};

export async function getQuizPublicState(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });
  if (!quiz) return null;
  const activeQuestion = quiz.questions.find((q) => q.isActive);
  let quizProgress: QuizProgressPayload | null = null;
  if (activeQuestion?.subQuizId) {
    const inSub = await prisma.question.findMany({
      where: { subQuizId: activeQuestion.subQuizId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const idx = inSub.findIndex((q) => q.id === activeQuestion.id);
    if (idx >= 0) {
      quizProgress = {
        subQuizId: activeQuestion.subQuizId,
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
    quizProgress,
    activeQuestion: activeQuestion
      ? {
          id: activeQuestion.id,
          text: activeQuestion.text,
          type:
            activeQuestion.type === QuestionType.SINGLE
              ? "single"
              : activeQuestion.type === QuestionType.MULTI
                ? "multi"
                : "tag_cloud",
          maxAnswers: activeQuestion.maxAnswers,
          options: activeQuestion.options.map((o) => ({ id: o.id, text: o.text })),
          isClosed: activeQuestion.isClosed,
        }
      : null,
  };
}

function mapPerQuestion(questions: QuestionDashboardRow[]) {
  return questions.map((q) => {
    const optionCounts: Record<string, number> = {};
    q.options.forEach((o) => {
      optionCounts[o.id] = 0;
    });
    q.answers.forEach((a) => {
      const selected = parseSelectedIds(a.selectedOptionIds);
      selected.forEach((id) => {
        if (id in optionCounts) optionCounts[id] += 1;
      });
    });
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
    return {
      questionId: q.id,
      text: q.text,
      subQuizId: q.subQuizId,
      projectorShowFirstCorrect: q.projectorShowFirstCorrect,
      projectorFirstCorrectWinnersCount: q.projectorFirstCorrectWinnersCount,
      type:
        q.type === QuestionType.SINGLE
          ? "single"
          : q.type === QuestionType.MULTI
            ? "multi"
            : "tag_cloud",
      optionStats: q.options.map((o) => ({
        optionId: o.id,
        text: o.text,
        count: optionCounts[o.id] ?? 0,
        isCorrect: o.isCorrect,
      })),
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
        type: { in: [QuestionType.SINGLE, QuestionType.MULTI] },
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
    rows: Array<{ participantId: string; nickname: string; score: number }>;
  }>
> {
  if (subQuizzes.length === 0) return [];
  const rows = await prisma.$queryRaw<
    Array<{
      subQuizId: string;
      participantId: string;
      nickname: string;
      score: bigint;
    }>
  >(Prisma.sql`
    SELECT q."subQuizId" AS "subQuizId",
           a."participantId" AS "participantId",
           p.nickname AS nickname,
           SUM(a."scoreAwarded")::bigint AS score
    FROM "Answer" a
    INNER JOIN "Question" q ON q.id = a."questionId"
    INNER JOIN "Participant" p ON p.id = a."participantId"
    WHERE a."quizId" = ${quizId}
      AND q."subQuizId" IS NOT NULL
    GROUP BY q."subQuizId", a."participantId", p.nickname
  `);

  const bySub = new Map<string, Array<{ participantId: string; nickname: string; score: number }>>();
  for (const r of rows) {
    const list = bySub.get(r.subQuizId);
    const row = {
      participantId: r.participantId,
      nickname: r.nickname,
      score: Number(r.score),
    };
    if (list) list.push(row);
    else bySub.set(r.subQuizId, [row]);
  }
  return subQuizzes.map((sq) => {
    const subRows = bySub.get(sq.id) ?? [];
    subRows.sort((a, b) => b.score - a.score);
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
    type: "single" | "multi" | "tag_cloud";
    isActive: boolean;
  }>;
  rows: Array<{
    participantId: string;
    nickname: string;
    scoresByQuestionId: Record<string, number | null>;
    totalScore: number;
  }>;
};

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

  const subQuiz = await prisma.subQuiz.findFirst({
    where: { id: subQuizId, quizId: room.id },
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
        select: { questionId: true, scoreAwarded: true },
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
      return {
        participantId: p.id,
        nickname: p.nickname,
        scoresByQuestionId,
        totalScore,
      };
    })
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore || a.nickname.localeCompare(b.nickname, "ru"),
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
      type:
        q.type === QuestionType.SINGLE
          ? "single"
          : q.type === QuestionType.MULTI
            ? "multi"
            : "tag_cloud",
      isActive: q.isActive,
    })),
    rows,
  };
}

export type DashboardResults = {
  perQuestion: ReturnType<typeof mapPerQuestion>;
  leaderboard: Array<{ participantId: string; nickname: string; score: number }>;
  leaderboardsBySubQuiz: Array<{
    subQuizId: string;
    title: string;
    rows: Array<{ participantId: string; nickname: string; score: number }>;
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
        options: { select: { id: true, text: true, isCorrect: true } },
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
    const nicks =
      row.subQuizId == null && row.type !== "tag_cloud"
        ? (firstCorrectMap.get(row.questionId) ?? [])
        : [];
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
    },
  });
  return answers.reduce<Record<string, string[]>>((acc, answer) => {
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
      data: { isActive: true, isClosed: false },
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
      prisma.question.updateMany({
        where: { quizId },
        data: { isActive: false, isClosed: true },
      }),
      prisma.question.update({
        where: { id: questionId },
        data: { isActive: true, isClosed: false },
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

export async function joinQuiz(payload: {
  slug: string;
  nickname: string;
  deviceId: string;
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: payload.slug },
  });
  if (!quiz) throw new Error("Quiz not found");
  const participant = await prisma.participant.upsert({
    where: {
      quizId_deviceId: { quizId: quiz.id, deviceId: payload.deviceId },
    },
    create: {
      quizId: quiz.id,
      deviceId: payload.deviceId,
      nickname: payload.nickname,
    },
    update: {
      nickname: payload.nickname,
    },
  });
  return { quizId: quiz.id, participantId: participant.id };
}

export async function submitAnswer(payload: {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  tagAnswers?: string[];
  participantId: string;
}) {
  const question = await prisma.question.findFirst({
    where: { id: payload.questionId, quizId: payload.quizId },
    include: { options: true },
  });
  if (!question) throw new Error("Question not found");
  if (!question.isActive || question.isClosed) throw new Error("Question is not open");

  const selected = [...new Set(payload.optionIds ?? [])].sort();
  const normalizedTags = (payload.tagAnswers ?? []).map(normalizeTag).filter(Boolean);
  if (question.type === QuestionType.TAG_CLOUD) {
    if (normalizedTags.length < 1) throw new Error("At least one tag is required");
    if (normalizedTags.length > Math.max(1, question.maxAnswers)) {
      throw new Error(`Too many tags: max ${question.maxAnswers}`);
    }
  } else if (selected.length < 1) {
    throw new Error("At least one option is required");
  }
  const isCorrect =
    question.type === QuestionType.TAG_CLOUD
      ? false
      : evaluateAnswer(question as QuestionWithOptions, selected);
  const quizScoring = question.scoringMode === ScoringMode.QUIZ && question.type !== QuestionType.TAG_CLOUD;
  const scoreAwarded = quizScoring && isCorrect ? question.points : 0;

  const existing = await prisma.answer.findUnique({
    where: {
      questionId_participantId: {
        questionId: payload.questionId,
        participantId: payload.participantId,
      },
    },
  });
  if (existing) {
    throw new Error("Already answered this question");
  }

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
    type: "single" | "multi" | "tag_cloud";
  };
  firstCorrect: null | { participantId: string; nickname: string; submittedAt: string };
  optionStats: Array<{ optionId: string; text: string; count: number; isCorrect: boolean }>;
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
    include: { options: true },
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
  if (q.type === QuestionType.SINGLE && correctOptionCount === 1) {
    const hit = answers.find((a) => a.isCorrect);
    if (hit) {
      firstCorrect = {
        participantId: hit.participant.id,
        nickname: hit.participant.nickname,
        submittedAt: hit.submittedAt.toISOString(),
      };
    }
  }

  const optionCounts: Record<string, number> = {};
  q.options.forEach((o) => {
    optionCounts[o.id] = 0;
  });
  answers.forEach((a) => {
    parseSelectedIds(a.selectedOptionIds).forEach((id) => {
      if (id in optionCounts) optionCounts[id] += 1;
    });
  });

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
      type:
        q.type === QuestionType.SINGLE
          ? "single"
          : q.type === QuestionType.MULTI
            ? "multi"
            : "tag_cloud",
    },
    firstCorrect,
    optionStats: q.options.map((o) => ({
      optionId: o.id,
      text: o.text,
      count: optionCounts[o.id] ?? 0,
      isCorrect: o.isCorrect,
    })),
    tagCloud,
    answerRows,
  };
}
