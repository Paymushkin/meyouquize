import { z } from "zod";

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["single", "multi", "tag_cloud"]),
  points: z.number().int().min(1).max(100).default(1),
  maxAnswers: z.number().int().min(1).max(5).optional(),
  scoringMode: z.enum(["poll", "quiz"]).optional(),
  projectorShowFirstCorrect: z.boolean().optional(),
  projectorFirstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
  options: z.array(
    z.object({
      text: z.string().min(1),
      isCorrect: z.boolean(),
    }),
  ),
}).superRefine((value, ctx) => {
  if (value.type === "tag_cloud") return;
  if (value.options.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Options must contain at least 2 items",
      path: ["options"],
    });
  }
});

const subQuizBlockSchema = z.object({
  title: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  questions: z.array(questionSchema),
});

export const adminAuthSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const createRoomSchema = z.object({
  eventName: z.string().min(3).max(60).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().min(1).max(120),
});

export const updateRoomSchema = z.object({
  title: z.string().min(1).max(120),
});

export const replaceRoomContentSchema = z.object({
  subQuizzes: z.array(subQuizBlockSchema).min(1),
  standaloneQuestions: z.array(questionSchema),
});

/** Частичное обновление настроек проектора у вопроса без replace всей комнаты (ответы не трогаем). */
export const patchQuestionProjectorSchema = z
  .object({
    projectorShowFirstCorrect: z.boolean().optional(),
    projectorFirstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (
      val.projectorShowFirstCorrect === undefined &&
      val.projectorFirstCorrectWinnersCount === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one projector field is required",
        path: [],
      });
    }
  });

/** @deprecated */
export const replaceQuestionsSchema = replaceRoomContentSchema;

export const createQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const joinQuizSchema = z.object({
  slug: z.string().min(1),
  nickname: z.string().min(1).max(40),
  deviceId: z.string().min(1),
});

export const submitAnswerSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).optional(),
  tagAnswers: z.array(z.string().min(1).max(80)).max(5).optional(),
});

export const resetAnswersSchema = z.object({
  quizId: z.string().min(1),
});

export const resetQuestionAnswersSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
});

export const subscribeResultsSchema = z.object({
  slug: z.string().min(1),
});

export const setPublicViewSchema = z.object({
  quizId: z.string().min(1),
  mode: z.enum(["title", "question", "leaderboard"]),
  questionId: z.string().min(1).optional(),
  highlightedLeadersCount: z.number().int().min(0).max(100).optional(),
  showVoteCount: z.boolean().optional(),
  showQuestionTitle: z.boolean().optional(),
  hiddenTagTexts: z.array(z.string().min(1).max(120)).max(300).optional(),
  injectedTagWords: z.array(
    z.object({
      text: z.string().min(1).max(120),
      count: z.number().int().min(1).max(100000),
    }),
  ).max(300).optional(),
  tagCountOverrides: z.array(
    z.object({
      text: z.string().min(1).max(120),
      count: z.number().int().min(0).max(100000),
    }),
  ).max(300).optional(),
  projectorBackground: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  cloudQuestionColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  cloudTagColors: z.array(z.string().regex(/^#([0-9a-fA-F]{6})$/)).length(5).optional(),
  cloudTopTagColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  cloudDensity: z.number().int().min(0).max(100).optional(),
  cloudTagPadding: z.number().int().min(0).max(40).optional(),
  cloudSpiral: z.enum(["archimedean", "rectangular"]).optional(),
  cloudAnimationStrength: z.number().int().min(0).max(100).optional(),
  voteQuestionTextColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  voteOptionTextColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  voteProgressTrackColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  voteProgressBarColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  showFirstCorrectAnswerer: z.boolean().optional(),
  firstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
});

export const activateQuestionSchema = z.object({
  quizId: z.string().min(1),
  subQuizId: z.string().min(1).optional(),
});

export const closeQuestionSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
});

export const toggleQuestionSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
  enabled: z.boolean(),
});

export const finishQuizSchema = z.object({
  quizId: z.string().min(1),
});

/** Закрыть все вопросы сабквиза и убрать активный вопрос с экрана (финальный экран у игроков через state без FINISHED комнаты). */
export const closeSubQuizSchema = z.object({
  quizId: z.string().min(1),
  subQuizId: z.string().min(1),
});
