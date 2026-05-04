import { prisma } from "./prisma.js";
import {
  DEFAULT_PUBLIC_VIEW_STATE,
  normalizeTagComparable,
  type PublicReactionWidget,
  type PublicReactionWidgetStats,
  type PublicViewState,
} from "@meyouquize/shared";
import type { QuestionReplaceInput, RoomContentReplaceInput } from "./quiz-service.js";
import { activateNextQuestion, createRoom, replaceRoomContent } from "./quiz-service.js";
import { evaluateRankingAnswer } from "./scoring.js";
import { ScoringMode, QuestionType } from "@prisma/client";
import { saveStoredPublicView } from "./socket/public-view-store.js";

const DEMO_SLUG = "demo";

function buildDemoRoomContent(): RoomContentReplaceInput {
  const subQuiz1: RoomContentReplaceInput["subQuizzes"][number] = {
    title: "Квиз: Общие факты",
    sortOrder: 0,
    questions: [
      // SINGLE
      {
        type: "single",
        text: "Какой химический символ у железа?",
        points: 5,
        scoringMode: "quiz",
        options: [
          { text: "Fl", isCorrect: false },
          { text: "Fe", isCorrect: true },
          { text: "Fr", isCorrect: false },
          { text: "In", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      // SINGLE
      {
        type: "single",
        text: "Какой континент самый большой на Земле?",
        points: 10,
        scoringMode: "quiz",
        options: [
          { text: "Европа", isCorrect: false },
          { text: "Азия", isCorrect: true },
          { text: "Африка", isCorrect: false },
          { text: "Северная Америка", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,

      // MULTI
      {
        type: "multi",
        text: "Какие из перечисленных животных относятся к млекопитающим?",
        points: 5,
        scoringMode: "quiz",
        options: [
          { text: "Акула", isCorrect: false },
          { text: "Кит", isCorrect: true },
          { text: "Крокодил", isCorrect: false },
          { text: "Собака", isCorrect: true },
        ],
      } satisfies QuestionReplaceInput,
      // MULTI
      {
        type: "multi",
        text: "Какие страны граничат с Россией?",
        points: 10,
        scoringMode: "quiz",
        options: [
          { text: "Бразилия", isCorrect: false },
          { text: "Казахстан", isCorrect: true },
          { text: "Япония", isCorrect: false },
          { text: "Норвегия", isCorrect: true },
        ],
      } satisfies QuestionReplaceInput,

      // TAG_CLOUD
      {
        type: "tag_cloud",
        text: "Перечислите все цвета флага Германии (ровно 3)",
        points: 5,
        scoringMode: "quiz",
        maxAnswers: 3,
        options: [
          { text: "Чёрный", isCorrect: true },
          { text: "Красный", isCorrect: true },
          { text: "Жёлтый", isCorrect: true },
          { text: "Синий", isCorrect: false },
          { text: "Зелёный", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      // TAG_CLOUD
      {
        type: "tag_cloud",
        text: "Назовите все первичные цвета RGB (ровно 3)",
        points: 10,
        scoringMode: "quiz",
        maxAnswers: 3,
        options: [
          { text: "Красный", isCorrect: true },
          { text: "Зелёный", isCorrect: true },
          { text: "Синий", isCorrect: true },
          { text: "Белый", isCorrect: false },
          { text: "Чёрный", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,

      // RANKING (quiz)
      {
        type: "ranking",
        text: "Расположите планеты по удалённости от Солнца (1 — ближайшая):",
        points: 10,
        scoringMode: "quiz",
        rankingKind: "quiz",
        rankingPointsByRank: [3, 2, 4, 1],
        // В режиме quiz правильность определяется порядком.
        options: [
          { text: "Земля", isCorrect: false },
          { text: "Венера", isCorrect: false },
          { text: "Марс", isCorrect: false },
          { text: "Меркурий", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      // RANKING (quiz)
      {
        type: "ranking",
        text: "Расположите материки по размеру (попробуйте угадай порядок):",
        points: 5,
        scoringMode: "quiz",
        rankingKind: "quiz",
        rankingPointsByRank: [3, 2, 4, 1],
        options: [
          { text: "Северная Америка", isCorrect: false },
          { text: "Африка", isCorrect: false },
          { text: "Южная Америка", isCorrect: false },
          { text: "Евразия", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
    ],
  };

  const subQuiz2: RoomContentReplaceInput["subQuizzes"][number] = {
    title: "Квиз: Наука и быт",
    sortOrder: 1,
    questions: [
      {
        type: "single",
        text: "Что такое скорость света (в общих словах)?",
        points: 5,
        scoringMode: "quiz",
        options: [
          { text: "Скорость ветра в среднем", isCorrect: false },
          { text: "Скорость вращения Земли", isCorrect: false },
          { text: "Максимальная скорость распространения информации", isCorrect: true },
          { text: "Скорость звука", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      {
        type: "single",
        text: "Какой прибор измеряет температуру воздуха?",
        points: 10,
        scoringMode: "quiz",
        options: [
          { text: "Барометр", isCorrect: false },
          { text: "Термометр", isCorrect: true },
          { text: "Спидометр", isCorrect: false },
          { text: "Манометр", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,

      {
        type: "multi",
        text: "Какие действия улучшают качество сна?",
        points: 5,
        scoringMode: "quiz",
        options: [
          { text: "Смотреть яркие экраны перед сном", isCorrect: false },
          { text: "Минимизировать кофеин вечером", isCorrect: true },
          { text: "Спать нерегулярно", isCorrect: false },
          { text: "Соблюдать режим", isCorrect: true },
        ],
      } satisfies QuestionReplaceInput,
      {
        type: "multi",
        text: "Какие компоненты входят в состав персонального компьютера?",
        points: 10,
        scoringMode: "quiz",
        options: [
          { text: "Экран", isCorrect: false },
          { text: "Оперативная память", isCorrect: true },
          { text: "Клавиатура", isCorrect: false },
          { text: "Процессор", isCorrect: true },
        ],
      } satisfies QuestionReplaceInput,

      {
        type: "tag_cloud",
        text: "Перечислите все состояния воды (ровно 3)",
        points: 5,
        scoringMode: "quiz",
        maxAnswers: 3,
        options: [
          { text: "Твёрдое", isCorrect: true },
          { text: "Жидкое", isCorrect: true },
          { text: "Газообразное", isCorrect: true },
          { text: "Плазма", isCorrect: false },
          { text: "Кристалл", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      {
        type: "tag_cloud",
        text: "Перечислите все цвета флага России (ровно 3)",
        points: 10,
        scoringMode: "quiz",
        maxAnswers: 3,
        options: [
          { text: "Белый", isCorrect: true },
          { text: "Синий", isCorrect: true },
          { text: "Красный", isCorrect: true },
          { text: "Зелёный", isCorrect: false },
          { text: "Чёрный", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,

      {
        type: "ranking",
        text: "Расположите этапы разработки ПО (1 — самый ранний):",
        points: 10,
        scoringMode: "quiz",
        rankingKind: "quiz",
        rankingPointsByRank: [2, 1, 4, 3],
        options: [
          { text: "Проектирование", isCorrect: false },
          { text: "Анализ требований", isCorrect: false },
          { text: "Тестирование", isCorrect: false },
          { text: "Кодирование", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
      {
        type: "ranking",
        text: "Расположите форматы обучения по интерактивности (от меньшей к большей):",
        points: 5,
        scoringMode: "quiz",
        rankingKind: "quiz",
        rankingPointsByRank: [4, 3, 2, 1],
        options: [
          { text: "Чтение", isCorrect: false },
          { text: "Практика", isCorrect: false },
          { text: "Групповые обсуждения", isCorrect: false },
          { text: "Онлайн-курсы", isCorrect: false },
        ],
      } satisfies QuestionReplaceInput,
    ],
  };

  // Отдельные голосования комнаты — те же типы вопросов.
  const standaloneQuestions: RoomContentReplaceInput["standaloneQuestions"] = [
    // SINGLE (poll)
    {
      type: "single",
      text: "Сколько минут в одном часе?",
      points: 5,
      scoringMode: "poll",
      options: [
        { text: "30", isCorrect: false },
        { text: "60", isCorrect: true },
        { text: "90", isCorrect: false },
        { text: "120", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,
    // SINGLE (quiz)
    {
      type: "single",
      text: "Какой цвет обычно идёт первым в радуге?",
      points: 10,
      scoringMode: "quiz",
      options: [
        { text: "Синий", isCorrect: false },
        { text: "Красный", isCorrect: true },
        { text: "Зелёный", isCorrect: false },
        { text: "Фиолетовый", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,

    // MULTI (poll)
    {
      type: "multi",
      text: "Какие элементы входят в состав воды?",
      points: 5,
      scoringMode: "poll",
      options: [
        { text: "Углерод", isCorrect: false },
        { text: "Кислород", isCorrect: true },
        { text: "Азот", isCorrect: false },
        { text: "Водород", isCorrect: true },
      ],
    } satisfies QuestionReplaceInput,
    // MULTI (quiz)
    {
      type: "multi",
      text: "Какие органы относятся к дыхательной системе?",
      points: 10,
      scoringMode: "quiz",
      options: [
        { text: "Печень", isCorrect: false },
        { text: "Бронхи", isCorrect: true },
        { text: "Почки", isCorrect: false },
        { text: "Лёгкие", isCorrect: true },
      ],
    } satisfies QuestionReplaceInput,

    // TAG_CLOUD (poll)
    {
      type: "tag_cloud",
      text: "Перечислите все цвета флага Франции (ровно 3)",
      points: 5,
      scoringMode: "poll",
      maxAnswers: 3,
      options: [
        { text: "Синий", isCorrect: true },
        { text: "Белый", isCorrect: true },
        { text: "Красный", isCorrect: true },
        { text: "Зелёный", isCorrect: false },
        { text: "Жёлтый", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,
    // TAG_CLOUD (quiz)
    {
      type: "tag_cloud",
      text: "Назовите все базовые стороны света (ровно 4)",
      points: 10,
      scoringMode: "quiz",
      maxAnswers: 4,
      options: [
        { text: "Север", isCorrect: true },
        { text: "Юг", isCorrect: true },
        { text: "Запад", isCorrect: true },
        { text: "Восток", isCorrect: true },
        { text: "Центр", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,

    // RANKING (quiz)
    {
      type: "ranking",
      text: "Расположите шаги разработки ПО (угадай порядок):",
      points: 10,
      scoringMode: "quiz",
      rankingKind: "quiz",
      rankingPointsByRank: [2, 3, 1, 4],
      options: [
        { text: "Кодирование", isCorrect: false },
        { text: "Анализ требований", isCorrect: false },
        { text: "Проектирование", isCorrect: false },
        { text: "Тестирование", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,

    // RANKING (jury)
    {
      type: "ranking",
      text: "Расположите повседневные привычки по важности (угадай порядок):",
      points: 5,
      scoringMode: "poll",
      rankingKind: "jury",
      rankingPointsByRank: [4, 3, 2, 1],
      options: [
        { text: "Регулярная зарядка", isCorrect: false },
        { text: "Сон по режиму", isCorrect: false },
        { text: "Чтение", isCorrect: false },
        { text: "Прогулки", isCorrect: false },
      ],
    } satisfies QuestionReplaceInput,
  ];

  return { subQuizzes: [subQuiz1, subQuiz2], standaloneQuestions };
}

function buildDemoParticipants() {
  return [
    { deviceId: "demo_device_alice", nickname: "Алиса" },
    { deviceId: "demo_device_boris", nickname: "Борис" },
    { deviceId: "demo_device_sofia", nickname: "София" },
    { deviceId: "demo_device_ilya", nickname: "Илья" },
    { deviceId: "demo_device_maria", nickname: "Мария" },

    { deviceId: "demo_device_artem", nickname: "Артём" },
    { deviceId: "demo_device_viktoria", nickname: "Виктория" },
    { deviceId: "demo_device_daniil", nickname: "Даниил" },
    { deviceId: "demo_device_ekaterina", nickname: "Екатерина" },
    { deviceId: "demo_device_kirill", nickname: "Кирилл" },
    { deviceId: "demo_device_liliya", nickname: "Лилия" },
    { deviceId: "demo_device_nikita", nickname: "Никита" },
    { deviceId: "demo_device_oksana", nickname: "Оксана" },
    { deviceId: "demo_device_pavel", nickname: "Павел" },
    { deviceId: "demo_device_tatyana", nickname: "Татьяна" },
  ] as const;
}

function buildDemoReactionWidgets(): {
  widgets: PublicReactionWidget[];
  stats: PublicReactionWidgetStats[];
  overlayText: string;
} {
  const overlayText = "Демо-реакции";
  const widget: PublicReactionWidget = {
    id: "demo_widget_1",
    title: overlayText,
    reactions: ["👍", "🔥", "👏", "🤔"],
  };
  const stats: PublicReactionWidgetStats[] = [
    {
      widgetId: widget.id,
      counts: {
        "👍": 9,
        "🔥": 4,
        "👏": 6,
        "🤔": 2,
      },
    },
  ];
  return { widgets: [widget], stats, overlayText };
}

function buildDemoPublicView(params: {
  randomizerCurrentWinners: string[];
  randomizerHistory: PublicViewState["randomizerHistory"];
  reactionsOverlayText: string;
  reactionsWidgets: PublicReactionWidget[];
  reactionsWidgetStats: PublicReactionWidgetStats[];
}): PublicViewState {
  const base = DEFAULT_PUBLIC_VIEW_STATE;
  return {
    ...base,
    // Сервер при старте принудительно переводит проектор в `title`, поэтому держим дефолт в этом же режиме.
    mode: "title",
    reportTitle: "Demo — отчет мероприятия",
    reportPublished: true,
    reportVoteQuestionIds: [],
    reportQuizQuestionIds: [],
    reportQuizSubQuizIds: [],
    randomizerMode: "names",
    randomizerListMode: "participants_only",
    randomizerTitle: "Demo Рандомайзер",
    randomizerExcludeWinners: true,
    randomizerSelectedWinners: params.randomizerCurrentWinners.slice(0, 2),
    randomizerCurrentWinners: params.randomizerCurrentWinners,
    randomizerHistory: params.randomizerHistory,
    speakerQuestionsEnabled: true,
    speakerQuestionsShowAuthorOnScreen: false,
    speakerQuestionsShowRecipientOnScreen: true,
    speakerQuestionsShowReactionsOnScreen: true,
    speakerQuestionsSpeakers: [
      "Александр Петров",
      "Екатерина Смирнова",
      "Дмитрий Иванов",
      "Анна Кузнецова",
      "Сергей Волков",
      "Ольга Романова",
      "Михаил Ковалёв",
    ],
    speakerQuestionsReactions: ["👍", "🔥", "👏", "❤️", "🤔"],
    reactionsOverlayText: params.reactionsOverlayText,
    reactionsWidgets: params.reactionsWidgets,
    reactionsWidgetStats: params.reactionsWidgetStats,
  };
}

async function upsertDemoQuizIfMissing() {
  const existing = await prisma.quiz.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) return existing;
  const created = await createRoom({ eventName: DEMO_SLUG, title: "Demo Quiz" });
  // publicView будет выставлен дальше (после создания вопросов, т.к. нужно знать questionId).
  return created;
}

async function createDemoAnswersAndSpeakerQuestions(input: {
  quizId: string;
  roomQuestions: Array<{
    id: string;
    order: number;
    type: QuestionType;
    scoringMode: ScoringMode;
    points: number;
    maxAnswers?: number | null;
    rankingKind?: "QUIZ" | "JURY";
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
    subQuizId: string | null;
  }>;
  participants: Array<{ id: string; nickname: string }>;
}) {
  const byNickname = new Map(input.participants.map((p) => [p.nickname, p] as const));
  const accuracyByParticipant = [
    0.95, 0.9, 0.85, 0.8, 0.8, 0.72, 0.68, 0.62, 0.58, 0.52, 0.46, 0.4, 0.34, 0.3, 0.24,
  ];

  function stableRand01(seedA: number, seedB: number): number {
    const raw = Math.abs(Math.sin((seedA + 1) * 12.9898 + (seedB + 1) * 78.233) * 43758.5453);
    return raw - Math.floor(raw);
  }

  await prisma.$transaction(async (tx) => {
    // 1) Answers for all seeded questions.
    for (let qIndex = 0; qIndex < input.roomQuestions.length; qIndex += 1) {
      const q = input.roomQuestions[qIndex]!;

      for (let pIndex = 0; pIndex < input.participants.length; pIndex += 1) {
        const p = input.participants[pIndex]!;
        const participantAccuracy = accuracyByParticipant[pIndex] ?? 0.35;
        const rand = stableRand01(pIndex, qIndex);
        const chooseCorrect =
          q.scoringMode === ScoringMode.QUIZ ? rand < participantAccuracy : rand > 0.25;

        // Уникальный для каждой пары (участник, вопрос) responseMs с дополнительным нелинейным оффсетом:
        // это убирает повторяющиеся времена даже в пределах одной тысячи.
        const deterministicJitter = Math.floor(stableRand01(qIndex, pIndex * 7 + 13) * 997);
        const baseResponseMs =
          1200 + q.order * 137 + pIndex * 311 + pIndex * pIndex * 17 + deterministicJitter;
        const responseMs = chooseCorrect ? baseResponseMs : baseResponseMs + 1200;

        let selectedOptionIds: string[] = [];
        let isCorrect = false;

        if (q.type === QuestionType.SINGLE) {
          const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
          const wrongIds = q.options.filter((o) => !o.isCorrect).map((o) => o.id);
          const correctId = correctIds[0] ?? q.options[0]?.id;
          const wrongId = wrongIds[0] ?? correctId!;

          selectedOptionIds = [chooseCorrect ? correctId! : wrongId!];
          isCorrect = correctIds.length > 0 ? selectedOptionIds[0] === correctId : false;
        } else if (q.type === QuestionType.MULTI) {
          const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
          const wrongIds = q.options.filter((o) => !o.isCorrect).map((o) => o.id);
          if (correctIds.length === 0 || q.options.length === 0) continue;

          if (chooseCorrect) {
            selectedOptionIds = [...correctIds];
          } else if (correctIds.length >= 2) {
            // Wrong: missing one correct option.
            selectedOptionIds = correctIds.slice(0, correctIds.length - 1);
          } else {
            // Wrong: single wrong option.
            selectedOptionIds = [wrongIds[0] ?? correctIds[0]!];
          }

          const correctSorted = [...new Set(correctIds)].sort();
          const selectedSorted = [...new Set(selectedOptionIds)].sort();
          isCorrect =
            correctSorted.length === selectedSorted.length &&
            correctSorted.every((id, i) => id === selectedSorted[i]);
        } else if (q.type === QuestionType.TAG_CLOUD) {
          const correctTags = q.options.filter((o) => o.isCorrect).map((o) => o.text);
          const correctTagsComparable = correctTags.map(normalizeTagComparable);
          const correctSet = new Set(correctTagsComparable);

          const maxAnswers = Math.max(1, Math.trunc(q.maxAnswers ?? 3));

          // Tags to use for "wrong" submissions (must not overlap with correct set).
          const extraWrongPool = [
            "кофе",
            "пицца",
            "корабль",
            "пингвин",
            "карта",
            "фильм",
            "река",
            "гора",
            "планета",
          ].filter((t) => !correctSet.has(normalizeTagComparable(t)));
          const wrongPool = extraWrongPool;

          const tagPick = (pool: string[], count: number) => {
            const unique: string[] = [];
            for (const t of pool) {
              const norm = normalizeTagComparable(t);
              if (!norm || unique.includes(norm)) continue;
              unique.push(norm);
              if (unique.length >= count) break;
            }
            return unique;
          };

          if (correctTagsComparable.length > 0) {
            if (chooseCorrect) {
              const firstCorrect = correctTagsComparable[0]!;
              const additional = maxAnswers > 1 ? tagPick(wrongPool, 1) : [];
              selectedOptionIds = [firstCorrect, ...additional].slice(0, maxAnswers);
            } else {
              selectedOptionIds = tagPick(wrongPool, Math.min(2, maxAnswers));
            }
            const selectedSet = new Set(selectedOptionIds);
            isCorrect = Array.from(selectedSet).some((t) => correctSet.has(t));
          }
        } else if (q.type === QuestionType.RANKING) {
          const expected = q.options.map((o) => o.id);
          if (q.rankingKind === "JURY") {
            selectedOptionIds = expected;
            isCorrect = false; // server всегда ставит isCorrect=false для jury ranking
          } else {
            const rotateWrong =
              expected.length > 1 ? [expected[1]!, expected[0]!, ...expected.slice(2)] : expected;
            const submitted = chooseCorrect ? expected : rotateWrong;
            const submittedIsCorrect = evaluateRankingAnswer(expected, submitted);
            isCorrect = q.scoringMode === ScoringMode.QUIZ && submittedIsCorrect;
            selectedOptionIds = submitted;
          }
        }

        const scoreAwarded = q.scoringMode === ScoringMode.QUIZ && isCorrect ? q.points : 0;

        if (selectedOptionIds.length < 1) continue;

        await tx.answer.create({
          data: {
            quizId: input.quizId,
            questionId: q.id,
            participantId: p.id,
            selectedOptionIds: JSON.stringify(selectedOptionIds),
            isCorrect,
            scoreAwarded,
            responseMs,
            submittedAt: new Date(Date.now() - qIndex * 1000 * 13 - pIndex * 1000),
          },
        });
      }
    }

    // 2) Speaker questions (>= 7, разной длины) + reactions.
    const speakerQuestions = [
      {
        speakerName: "Александр Петров",
        author: "Алиса",
        text: "Почему небо голубое? Коротко: что происходит в атмосфере и почему цвет меняется на закате?",
        isOnScreen: true,
        reactions: [
          { by: "Алиса", reaction: "👍" },
          { by: "Борис", reaction: "🔥" },
          { by: "София", reaction: "👏" },
          { by: "Илья", reaction: "🤔" },
          { by: "Мария", reaction: "❤️" },
        ],
      },
      {
        speakerName: "Екатерина Смирнова",
        author: "Борис",
        text: "Чем погода отличается от климата? И почему климатические тренды важно понимать, а не только смотреть текущие прогнозы?",
        isOnScreen: false,
        reactions: [
          { by: "Алиса", reaction: "👏" },
          { by: "Борис", reaction: "👍" },
          { by: "София", reaction: "🔥" },
          { by: "Илья", reaction: "👍" },
          { by: "Мария", reaction: "🤔" },
        ],
      },
      {
        speakerName: "Дмитрий Иванов",
        author: "София",
        text: "Какая страна первой запустила спутник на околоземную орбиту? Как это повлияло на развитие космических программ?",
        isOnScreen: true,
        reactions: [
          { by: "Алиса", reaction: "🔥" },
          { by: "Борис", reaction: "👏" },
          { by: "София", reaction: "👍" },
          { by: "Илья", reaction: "🤔" },
          { by: "Мария", reaction: "❤️" },
        ],
      },
      {
        speakerName: "Анна Кузнецова",
        author: "Илья",
        text: "Что такое фотосинтез и почему он напрямую связан с жизнью на Земле? Попробуйте объяснить простыми словами — даже тем, кто не учил биологию.",
        isOnScreen: false,
        reactions: [
          { by: "Алиса", reaction: "👍" },
          { by: "Борис", reaction: "❤️" },
          { by: "София", reaction: "👏" },
          { by: "Илья", reaction: "🔥" },
          { by: "Мария", reaction: "🤔" },
        ],
      },
      {
        speakerName: "Сергей Волков",
        author: "Мария",
        text: "Сколько граней у правильного додекаэдра и как вообще получается эта «магическая» цифра? Можно ли вывести это из базовых свойств фигур?",
        isOnScreen: true,
        reactions: [
          { by: "Алиса", reaction: "🤔" },
          { by: "Борис", reaction: "👍" },
          { by: "София", reaction: "❤️" },
          { by: "Илья", reaction: "🔥" },
          { by: "Мария", reaction: "👏" },
        ],
      },
      {
        speakerName: "Ольга Романова",
        author: "Алиса",
        text: "Почему круги на воде называют волнами, а звук — тоже волна? В чём сходство и различие между механическими и звуковыми волнами?",
        isOnScreen: false,
        reactions: [
          { by: "Алиса", reaction: "🔥" },
          { by: "Борис", reaction: "👍" },
          { by: "София", reaction: "👏" },
          { by: "Илья", reaction: "❤️" },
          { by: "Мария", reaction: "🤔" },
        ],
      },
      {
        speakerName: "Михаил Ковалёв",
        author: "Борис",
        text: "Как называется наука, которая изучает звёзды и другие небесные тела? И какие практические задачи решаются благодаря этой области?",
        isOnScreen: true,
        reactions: [
          { by: "Алиса", reaction: "👍" },
          { by: "Борис", reaction: "👏" },
          { by: "София", reaction: "🔥" },
          { by: "Илья", reaction: "🤔" },
          { by: "Мария", reaction: "❤️" },
        ],
      },
    ] as const;

    for (let idx = 0; idx < speakerQuestions.length; idx += 1) {
      const s = speakerQuestions[idx]!;
      const author = byNickname.get(s.author);
      if (!author) continue;

      const speakerQuestion = await tx.speakerQuestion.create({
        data: {
          quizId: input.quizId,
          participantId: author.id,
          speakerName: s.speakerName,
          text: s.text,
          isVisibleToUsers: true,
          status: "APPROVED",
          isOnScreen: s.isOnScreen,
          createdAt: new Date(Date.now() - idx * 1000 * 60),
        },
      });

      for (const r of s.reactions) {
        const by = byNickname.get(r.by);
        if (!by) continue;
        await tx.speakerQuestionReaction.create({
          data: {
            speakerQuestionId: speakerQuestion.id,
            participantId: by.id,
            reaction: r.reaction,
            createdAt: new Date(Date.now() - idx * 1000 * 60 + 1000),
          },
        });
      }
    }
  });
}

export async function resetDemoQuizToDefault(): Promise<{ quizId: string }> {
  await upsertDemoQuizIfMissing();

  const roomContent = buildDemoRoomContent();
  const seededRoom = await replaceRoomContent(DEMO_SLUG, roomContent);
  if (!seededRoom) throw new Error("Demo room not found after replace");
  const quizId = seededRoom.id;

  // Drop all participants (and cascades: answers + speaker questions + their reactions).
  await prisma.participant.deleteMany({ where: { quizId } });

  const demoParticipants = buildDemoParticipants();
  const participants = [];
  for (const p of demoParticipants) {
    const created = await prisma.participant.create({
      data: {
        quizId,
        deviceId: p.deviceId,
        nickname: p.nickname,
      },
    });
    participants.push({ id: created.id, nickname: created.nickname });
  }

  const roomWithOptions = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      subQuizzes: { orderBy: { sortOrder: "asc" } },
      questions: { include: { options: true } },
    },
  });
  if (!roomWithOptions) throw new Error("Demo room not found after seed");

  const questions = roomWithOptions.questions.map((q) => ({
    id: q.id,
    order: q.order,
    type: q.type,
    scoringMode: q.scoringMode,
    points: q.points,
    maxAnswers: q.maxAnswers,
    rankingKind: q.type === QuestionType.RANKING ? (q.rankingKind as "QUIZ" | "JURY") : undefined,
    subQuizId: q.subQuizId,
    options: [...q.options]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
  }));

  const firstSubQuiz = roomWithOptions.subQuizzes[0]!;

  // Seed answers + speaker questions/reactions.
  await createDemoAnswersAndSpeakerQuestions({
    quizId,
    roomQuestions: questions,
    participants,
  });

  // Seed randomizer/reactions/report in public view.
  const { widgets, stats, overlayText } = buildDemoReactionWidgets();
  const randomizerHistory = [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      winners: ["Алиса", "Борис"],
      mode: "names" as const,
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      winners: ["София"],
      mode: "names" as const,
    },
  ];
  const randomizerCurrentWinners = ["Алиса", "София"];

  const publicView: PublicViewState = buildDemoPublicView({
    randomizerCurrentWinners,
    randomizerHistory,
    reactionsOverlayText: overlayText,
    reactionsWidgets: widgets,
    reactionsWidgetStats: stats,
  });

  await saveStoredPublicView(quizId, publicView);

  // Make first quiz question “active” for quick manual play.
  await activateNextQuestion(quizId, firstSubQuiz.id);

  return { quizId };
}

export async function ensureDemoQuizExists(): Promise<void> {
  const existing = await prisma.quiz.findUnique({
    where: { slug: DEMO_SLUG },
    select: {
      id: true,
      publicView: true,
      _count: { select: { questions: true, participants: true } },
    },
  });
  if (!existing || existing._count.questions === 0 || existing._count.participants < 15) {
    await resetDemoQuizToDefault();
  }
}
