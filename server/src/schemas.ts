import { z } from "zod";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeClientAssetUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  return isHttpUrl(v);
}

const externalHttpUrlSchema = z.string().trim().min(1).max(1000).refine(isHttpUrl, {
  message: "URL must use http or https",
});

const clientAssetUrlSchema = z.string().trim().min(1).max(1000).refine(isSafeClientAssetUrl, {
  message: "Asset URL must be absolute http(s) or start with /",
});
const optionalExternalHttpUrlSchema = z.union([externalHttpUrlSchema, z.literal("")]).optional();
const optionalClientAssetUrlSchema = z.union([clientAssetUrlSchema, z.literal("")]).optional();

const questionSchema = z
  .object({
    id: z.string().min(1).optional(),
    text: z.string().min(1),
    type: z.enum(["single", "multi", "tag_cloud", "ranking"]),
    points: z.number().int().min(1).max(10_000).default(1),
    maxAnswers: z.number().int().min(1).max(5).optional(),
    scoringMode: z.enum(["poll", "quiz"]).optional(),
    projectorShowFirstCorrect: z.boolean().optional(),
    projectorFirstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
    rankingPointsByRank: z.array(z.number().int().min(0).max(10_000)).nullable().optional(),
    rankingProjectorMetric: z.enum(["avg_rank", "avg_score", "total_score"]).optional(),
    rankingKind: z.enum(["quiz", "jury"]).optional(),
    rankingPlayerHint: z.string().trim().max(300).nullable().optional(),
    options: z.array(
      z.object({
        text: z.string().min(1),
        isCorrect: z.boolean(),
      }),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.type === "tag_cloud") {
      const sm = value.scoringMode ?? "poll";
      if (sm === "quiz") {
        if (value.options.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "В режиме квиза для облака тегов нужен хотя бы один эталонный тег",
            path: ["options"],
          });
        } else if (!value.options.some((o) => o.isCorrect)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Отметьте хотя бы один правильный эталонный тег",
            path: ["options"],
          });
        }
      }
      return;
    }
    if (value.type === "ranking") {
      if (value.options.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для ранжирования нужно не меньше трёх вариантов",
          path: ["options"],
        });
      }
      if (
        value.rankingPointsByRank != null &&
        value.rankingPointsByRank !== undefined &&
        value.rankingPointsByRank.length !== value.options.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Число баллов по позициям должно совпадать с числом вариантов",
          path: ["rankingPointsByRank"],
        });
      }
      if (value.rankingKind === "jury") {
        if (
          value.rankingPointsByRank == null ||
          value.rankingPointsByRank.length !== value.options.length
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "В режиме жюри задайте баллы для каждой позиции",
            path: ["rankingPointsByRank"],
          });
        }
      }
      return;
    }
    if (value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Options must contain at least 2 items",
        path: ["options"],
      });
    }
  });

const subQuizBlockSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(120),
  questionFlowMode: z.enum(["manual", "auto"]).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  questions: z.array(questionSchema),
});

export const adminAuthSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const createRoomSchema = z.object({
  eventName: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().min(1).max(120),
});

export const updateRoomSchema = z.object({
  title: z.string().min(1).max(120),
});

export const replaceRoomContentSchema = z.object({
  subQuizzes: z.array(subQuizBlockSchema),
  standaloneQuestions: z.array(questionSchema),
});

/** Частичное обновление настроек проектора у вопроса без replace всей комнаты (ответы не трогаем). */
export const patchQuestionProjectorSchema = z
  .object({
    projectorShowFirstCorrect: z.boolean().optional(),
    projectorFirstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
    rankingProjectorMetric: z.enum(["avg_rank", "avg_score", "total_score"]).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (
      val.projectorShowFirstCorrect === undefined &&
      val.projectorFirstCorrectWinnersCount === undefined &&
      val.rankingProjectorMetric === undefined
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

export const updateNicknameSchema = z.object({
  quizId: z.string().min(1),
  nickname: z.string().min(1).max(40),
});

export const submitAnswerSchema = z.object({
  quizId: z.string().min(1),
  questionId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).optional(),
  /** Полный порядок id вариантов (лучше → хуже) для типа RANKING */
  rankedOptionIds: z.array(z.string().min(1)).optional(),
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
  mode: z.enum([
    "title",
    "question",
    "leaderboard",
    "speaker_questions",
    "reactions",
    "randomizer",
    "report",
  ]),
  questionId: z.string().min(1).optional(),
  questionRevealStage: z.enum(["options", "results"]).optional(),
  highlightedLeadersCount: z.number().int().min(0).max(100).optional(),
  showVoteCount: z.boolean().optional(),
  showCorrectOption: z.boolean().optional(),
  showQuestionTitle: z.boolean().optional(),
  hiddenTagTexts: z.array(z.string().min(1).max(120)).max(300).optional(),
  injectedTagWords: z
    .array(
      z.object({
        text: z.string().min(1).max(120),
        count: z.number().int().min(1).max(100000),
      }),
    )
    .max(300)
    .optional(),
  tagCountOverrides: z
    .array(
      z.object({
        text: z.string().min(1).max(120),
        count: z.number().int().min(0).max(100000),
      }),
    )
    .max(300)
    .optional(),
  projectorBackground: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  cloudQuestionColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  cloudTagColors: z
    .array(z.string().regex(/^#([0-9a-fA-F]{6})$/))
    .length(5)
    .optional(),
  cloudTopTagColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  cloudCorrectTagColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  cloudDensity: z.number().int().min(0).max(100).optional(),
  cloudTagPadding: z.number().int().min(0).max(40).optional(),
  cloudSpiral: z.enum(["archimedean", "rectangular"]).optional(),
  cloudAnimationStrength: z.number().int().min(0).max(100).optional(),
  voteQuestionTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  voteOptionTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  voteProgressTrackColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  voteProgressBarColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  showFirstCorrectAnswerer: z.boolean().optional(),
  firstCorrectWinnersCount: z.number().int().min(1).max(20).optional(),
  speakerQuestionsEnabled: z.boolean().optional(),
  speakerQuestionsSpeakers: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  speakerQuestionsReactions: z.array(z.string().trim().min(1).max(16)).max(12).optional(),
  speakerQuestionsShowAuthorOnScreen: z.boolean().optional(),
  speakerQuestionsShowRecipientOnScreen: z.boolean().optional(),
  speakerQuestionsShowReactionsOnScreen: z.boolean().optional(),
  showEventTitleOnPlayer: z.boolean().optional(),
  playerBanners: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        linkUrl: externalHttpUrlSchema,
        backgroundUrl: clientAssetUrlSchema,
        size: z.enum(["2x1", "1x1", "full"]).optional(),
        isVisible: z.boolean().optional(),
      }),
    )
    .max(50)
    .optional(),
  activePlayerBannerId: z.string().trim().min(1).max(80).optional(),
  speakerTileText: z.string().trim().max(120).optional(),
  speakerTileBackgroundColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  speakerTileVisible: z.boolean().optional(),
  programTileText: z.string().trim().max(120).optional(),
  programTileBackgroundColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  programTileLinkUrl: optionalExternalHttpUrlSchema,
  programTileVisible: z.boolean().optional(),
  playerTilesOrder: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  reactionsOverlayText: z.string().trim().max(120).optional(),
  reactionsWidgets: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        title: z.string().trim().max(120),
        reactions: z.array(z.string().trim().min(1).max(16)).min(1).max(30),
      }),
    )
    .max(100)
    .optional(),
  playerVisibleResultQuestionIds: z.array(z.string().trim().min(1).max(80)).max(200).optional(),
  randomizerMode: z.enum(["names", "numbers"]).optional(),
  randomizerListMode: z.enum(["participants_only", "free_list"]).optional(),
  randomizerTitle: z.string().trim().max(120).optional(),
  randomizerNamesText: z.string().max(15000).optional(),
  randomizerMinNumber: z.number().int().min(-1000000).max(1000000).optional(),
  randomizerMaxNumber: z.number().int().min(-1000000).max(1000000).optional(),
  randomizerWinnersCount: z.number().int().min(1).max(500).optional(),
  randomizerExcludeWinners: z.boolean().optional(),
  randomizerSelectedWinners: z.array(z.string().trim().min(1).max(120)).max(10000).optional(),
  randomizerCurrentWinners: z.array(z.string().trim().min(1).max(120)).max(500).optional(),
  randomizerHistory: z
    .array(
      z.object({
        timestamp: z.string().trim().min(1).max(80),
        winners: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
        mode: z.enum(["names", "numbers"]),
      }),
    )
    .max(200)
    .optional(),
  randomizerRunId: z.number().int().min(0).max(1000000000).optional(),
  reportTitle: z.string().trim().max(120).optional(),
  reportModules: z
    .array(
      z.enum([
        "event_header",
        "participation_summary",
        "quiz_results",
        "vote_results",
        "reactions_summary",
        "randomizer_summary",
        "speaker_questions_summary",
      ]),
    )
    .max(20)
    .optional(),
  reportVoteQuestionIds: z.array(z.string().trim().min(1).max(80)).max(400).optional(),
  reportQuizQuestionIds: z.array(z.string().trim().min(1).max(80)).max(400).optional(),
  reportQuizSubQuizIds: z.array(z.string().trim().min(1).max(80)).max(400).optional(),
  reportSubQuizHideParticipantTableIds: z
    .array(z.string().trim().min(1).max(80))
    .max(400)
    .optional(),
  reportRandomizerRunIds: z
    .array(z.string().regex(/^(history:\d{1,4}|current)$/))
    .max(200)
    .optional(),
  reportReactionsWidgetIds: z.array(z.string().trim().min(1).max(80)).max(200).optional(),
  reportSpeakerQuestionIds: z.array(z.string().trim().min(1).max(80)).max(400).optional(),
  reportPublished: z.boolean().optional(),
  brandPrimaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  brandAccentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  brandSurfaceColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  brandTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  brandFontFamily: z.string().trim().max(200).optional(),
  brandFontUrl: optionalClientAssetUrlSchema,
  brandLogoUrl: optionalClientAssetUrlSchema,
  brandPlayerBackgroundImageUrl: optionalClientAssetUrlSchema,
  brandProjectorBackgroundImageUrl: optionalClientAssetUrlSchema,
  brandBodyBackgroundColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  /** @deprecated */
  brandBackgroundImageUrl: optionalClientAssetUrlSchema,
});

export const subscribeSpeakerQuestionsSchema = z.object({
  slug: z.string().min(1),
  viewer: z.enum(["player", "projector", "admin"]).optional(),
});

export const createSpeakerQuestionSchema = z.object({
  quizId: z.string().min(1),
  speakerName: z.string().trim().min(1).max(80),
  text: z.string().trim().min(3).max(500),
});

export const speakerQuestionReactSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
  reaction: z.string().trim().min(1).max(16),
});

export const adminSpeakerQuestionStatusSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const adminSpeakerQuestionScreenSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
  isOnScreen: z.boolean(),
});

export const adminSpeakerQuestionUserVisibleSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
  isVisibleToUsers: z.boolean(),
});

export const adminSpeakerQuestionUpdateSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
  text: z.string().trim().min(3).max(500),
});

export const adminSpeakerQuestionDeleteSchema = z.object({
  quizId: z.string().min(1),
  speakerQuestionId: z.string().min(1),
});

export const adminSpeakerSettingsSchema = z.object({
  quizId: z.string().min(1),
  enabled: z.boolean().optional(),
  speakers: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  reactions: z.array(z.string().trim().min(1).max(16)).max(12).optional(),
  showAuthorOnScreen: z.boolean().optional(),
  showRecipientOnScreen: z.boolean().optional(),
  showReactionsOnScreen: z.boolean().optional(),
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

export const refreshQuizStateSchema = z.object({
  quizId: z.string().min(1),
});

export const startReactionSessionSchema = z.object({
  quizId: z.string().min(1),
  durationSec: z.number().int().min(10).max(86400),
  reactions: z.array(z.string().trim().min(1).max(16)).min(1).max(12).optional(),
});

export const stopReactionSessionSchema = z.object({
  quizId: z.string().min(1),
});

export const toggleReactionSchema = z.object({
  quizId: z.string().min(1),
  reactionType: z.string().trim().min(1).max(16),
});

/** Закрыть все вопросы сабквиза и убрать активный вопрос с экрана (финальный экран у игроков через state без FINISHED комнаты). */
export const closeSubQuizSchema = z.object({
  quizId: z.string().min(1),
  subQuizId: z.string().min(1),
});

export const startSubQuizAutoSchema = z.object({
  quizId: z.string().min(1),
  subQuizId: z.string().min(1),
});
