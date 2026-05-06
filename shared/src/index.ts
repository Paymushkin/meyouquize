export type QuestionType = "single" | "multi" | "tag_cloud" | "ranking";
export type QuizStatus = "draft" | "live" | "finished";
export const SPEAKER_TILE_ID = "speaker_tile";
export const PROGRAM_TILE_ID = "program_tile";

export interface OptionInput {
  text: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  text: string;
  type: QuestionType;
  points: number;
  maxAnswers?: number;
  options: OptionInput[];
}

export interface CreateQuizPayload {
  title: string;
  questions: QuestionInput[];
}

export interface QuizJoinPayload {
  slug: string;
  nickname: string;
  deviceId: string;
}

export interface SubmitAnswerPayload {
  quizId: string;
  questionId: string;
  optionIds?: string[];
  /** Порядок id вариантов (лучше → хуже) для типа ranking */
  rankedOptionIds?: string[];
  tagAnswers?: string[];
}

export type PublicViewMode =
  | "title"
  | "question"
  | "leaderboard"
  | "speaker_questions"
  | "reactions"
  | "randomizer"
  | "report";
export type QuestionRevealStage = "options" | "results";
export type RandomizerMode = "names" | "numbers";
export type RandomizerListMode = "participants_only" | "free_list";
export type ReportModuleId =
  | "event_header"
  | "participation_summary"
  | "quiz_results"
  | "vote_results"
  | "reactions_summary"
  | "randomizer_summary"
  | "speaker_questions_summary";

export type CloudWordCount = { text: string; count: number };
export type PublicBanner = {
  id: string;
  linkUrl: string;
  backgroundUrl: string;
  size: "2x1" | "1x1" | "full";
  isVisible: boolean;
};
export type PublicReactionWidget = {
  id: string;
  title: string;
  reactions: string[];
};
export type PublicReactionWidgetStats = {
  widgetId: string;
  counts: Record<string, number>;
};
export type RandomizerHistoryEntry = {
  timestamp: string;
  winners: string[];
  mode: RandomizerMode;
};

export interface PublicViewState {
  mode: PublicViewMode;
  questionId?: string;
  questionRevealStage: QuestionRevealStage;
  highlightedLeadersCount: number;
  showVoteCount: boolean;
  /** Показывать подсветку правильного ответа в вариантах на проекторе */
  showCorrectOption: boolean;
  showQuestionTitle: boolean;
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  /** Подсветка эталонных («правильных») тегов в облаке на проекторе */
  cloudCorrectTagColor: string;
  cloudDensity: number;
  cloudTagPadding: number;
  cloudSpiral: "archimedean" | "rectangular";
  cloudAnimationStrength: number;
  /** Обычное голосование: стиль столбиков */
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  /** Для голосований комнаты: показывать на проекторе ники первых верно ответивших */
  showFirstCorrectAnswerer: boolean;
  /** Сколько первых верных ответов показать (1–20), если showFirstCorrectAnswerer */
  firstCorrectWinnersCount: number;
  /** Секция «Вопросы спикерам»: показывать кнопку у игроков */
  speakerQuestionsEnabled: boolean;
  /** Секция «Вопросы спикерам»: список спикеров (можно выбрать конкретного или "всем") */
  speakerQuestionsSpeakers: string[];
  /** Секция «Вопросы спикерам»: список доступных реакций */
  speakerQuestionsReactions: string[];
  /** Секция «Вопросы спикерам»: показывать автора вопроса в режиме проектора */
  speakerQuestionsShowAuthorOnScreen: boolean;
  /** Секция «Вопросы спикерам»: показывать подпись «кому: …» на проекторе */
  speakerQuestionsShowRecipientOnScreen: boolean;
  /** Секция «Вопросы спикерам»: показывать счётчики реакций на проекторе */
  speakerQuestionsShowReactionsOnScreen: boolean;
  /** Показывать название ивента в интерфейсе игрока */
  showEventTitleOnPlayer: boolean;
  /** Баннеры для пользовательского интерфейса */
  playerBanners: PublicBanner[];
  /** id активного баннера, который показывается пользователям */
  activePlayerBannerId?: string;
  /** Текст плитки "Вопросы спикерам" у пользователя */
  speakerTileText: string;
  /** Фоновый цвет плитки "Вопросы спикерам" у пользователя */
  speakerTileBackgroundColor: string;
  /** Цвет текста плитки "Вопросы спикерам" у пользователя */
  speakerTileTextColor: string;
  /** Показывать плитку "Вопросы спикерам" у пользователя */
  speakerTileVisible: boolean;
  /** Текст кнопки "Программа" у пользователя */
  programTileText: string;
  /** Фоновый цвет кнопки "Программа" у пользователя */
  programTileBackgroundColor: string;
  /** Цвет текста кнопки "Программа" у пользователя */
  programTileTextColor: string;
  /** Внешняя ссылка кнопки "Программа" у пользователя */
  programTileLinkUrl: string;
  /** Показывать кнопку "Программа" у пользователя */
  programTileVisible: boolean;
  /** Порядок плиток в пользовательском интерфейсе (баннеры + speaker_tile + program_tile) */
  playerTilesOrder: string[];
  /** Крупный текст в режиме реакций на проекторе (по центру экрана) */
  reactionsOverlayText: string;
  /** Набор сохраненных виджетов реакций для админки */
  reactionsWidgets: PublicReactionWidget[];
  /** Сохраненные счетчики реакций по виджетам (персистентно) */
  reactionsWidgetStats: PublicReactionWidgetStats[];
  /** Список questionId, для которых у пользователя показываются плитки результатов */
  playerVisibleResultQuestionIds: string[];
  /** Интерфейс пользователя: цвет текста ответов в карточках результатов */
  playerVoteOptionTextColor: string;
  /** Интерфейс пользователя: цвет трека прогресс-бара в карточках результатов */
  playerVoteProgressTrackColor: string;
  /** Интерфейс пользователя: цвет заполнения прогресс-бара в карточках результатов */
  playerVoteProgressBarColor: string;
  /** Проектор: показывать QR-код входа в ивент */
  projectorJoinQrVisible: boolean;
  /** Проектор: подпись рядом с QR-кодом входа */
  projectorJoinQrText: string;
  projectorJoinQrTextColor: string;
  /** Рандомайзер: режим выбора (имена/числа) */
  randomizerMode: RandomizerMode;
  /** Рандомайзер: источник списка имён */
  randomizerListMode: RandomizerListMode;
  /** Рандомайзер: заголовок блока на проекторе */
  randomizerTitle: string;
  /** Рандомайзер: исходный список имён (по одному в строке) */
  randomizerNamesText: string;
  /** Рандомайзер: нижняя граница диапазона чисел */
  randomizerMinNumber: number;
  /** Рандомайзер: верхняя граница диапазона чисел */
  randomizerMaxNumber: number;
  /** Рандомайзер: сколько победителей выбирать за запуск */
  randomizerWinnersCount: number;
  /** Рандомайзер: исключать ранее выбранных */
  randomizerExcludeWinners: boolean;
  /** Рандомайзер: список ранее выбранных победителей (для исключения) */
  randomizerSelectedWinners: string[];
  /** Рандомайзер: победители последнего запуска */
  randomizerCurrentWinners: string[];
  /** Рандомайзер: история запусков */
  randomizerHistory: RandomizerHistoryEntry[];
  /** Рандомайзер: счётчик запусков (триггер анимации на проекторе) */
  randomizerRunId: number;
  /** Отчет: заголовок публичной страницы */
  reportTitle: string;
  /** Отчет: включенные блоки и их порядок */
  reportModules: ReportModuleId[];
  /** Отчет: какие голосования показывать (пусто = все) */
  reportVoteQuestionIds: string[];
  /** Отчет: какие вопросы квизов показывать (пусто = все) */
  reportQuizQuestionIds: string[];
  /** Отчет: какие квизы показывать (пусто = все) */
  reportQuizSubQuizIds: string[];
  /**
   * Отчет: id субквизов, для которых скрыта таблица баллов участников по вопросам
   * (как на странице результатов в админке). Пусто = таблица показывается для всех включённых квизов.
   */
  reportSubQuizHideParticipantTableIds: string[];
  /**
   * Отчет: какие запуски рандомайзера показывать (`history:0`, `history:1`, … и/или `current`).
   * Пусто = все запуски из истории и текущие победители (как раньше).
   */
  reportRandomizerRunIds: string[];
  /** Отчет: какие виджеты реакций показывать (id). Пусто = все. */
  reportReactionsWidgetIds: string[];
  /** Отчет: какие вопросы спикерам показывать (id). Пусто = все (в пределах лимита на сервере). */
  reportSpeakerQuestionIds: string[];
  /** Отчет: опубликован ли отчет по публичной ссылке */
  reportPublished: boolean;
  /** Бренд: базовый акцентный цвет интерфейса */
  brandPrimaryColor: string;
  /** Бренд: дополнительный цвет интерфейса */
  brandAccentColor: string;
  /** Бренд: цвет поверхностей/карточек */
  brandSurfaceColor: string;
  /** Бренд: базовый цвет текста */
  brandTextColor: string;
  /** Бренд: семейство шрифта */
  brandFontFamily: string;
  /** Бренд: URL файла кастомного шрифта (если используется) */
  brandFontUrl: string;
  /** Бренд: URL логотипа */
  brandLogoUrl: string;
  /** Бренд: URL фона интерфейса игрока */
  brandPlayerBackgroundImageUrl: string;
  /** Бренд: URL фона проектора */
  brandProjectorBackgroundImageUrl: string;
  /** Бренд: цвет фона body (внешняя область страницы игрока) */
  brandBodyBackgroundColor: string;
  /** @deprecated legacy поле, используйте раздельные player/projector */
  brandBackgroundImageUrl?: string;
}

export interface PublicViewPayload extends PublicViewState {
  title?: string;
}

export type PublicViewPatch = Partial<PublicViewState> & {
  mode?: PublicViewMode;
  questionId?: string;
};

export const DEFAULT_PROJECTOR_JOIN_QR_VISIBLE = true;
export const PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH = 200;
export const DEFAULT_PROJECTOR_JOIN_QR_TEXT = "Сканируйте QR-код, чтобы войти в ивент";
export const DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR = "#ffffff";

export const DEFAULT_PUBLIC_VIEW_STATE: PublicViewState = {
  mode: "title",
  questionRevealStage: "options",
  highlightedLeadersCount: 3,
  showVoteCount: false,
  showCorrectOption: false,
  showQuestionTitle: true,
  hiddenTagTexts: [],
  injectedTagWords: [],
  tagCountOverrides: [],
  projectorBackground: "#7c5acb",
  cloudQuestionColor: "#1f1f1f",
  cloudTagColors: ["#1f1f1f", "#1976d2", "#2e7d32", "#ef6c00", "#6a1b9a"],
  cloudTopTagColor: "#d32f2f",
  cloudCorrectTagColor: "#2e7d32",
  cloudDensity: 60,
  cloudTagPadding: 5,
  cloudSpiral: "archimedean",
  cloudAnimationStrength: 30,
  voteQuestionTextColor: "#1f1f1f",
  voteOptionTextColor: "#1f1f1f",
  voteProgressTrackColor: "#e3e3e3",
  voteProgressBarColor: "#1976d2",
  showFirstCorrectAnswerer: false,
  firstCorrectWinnersCount: 1,
  speakerQuestionsEnabled: false,
  speakerQuestionsSpeakers: [],
  speakerQuestionsReactions: ["👍", "🔥", "👏", "❤️"],
  speakerQuestionsShowAuthorOnScreen: false,
  speakerQuestionsShowRecipientOnScreen: true,
  speakerQuestionsShowReactionsOnScreen: true,
  showEventTitleOnPlayer: true,
  playerBanners: [],
  activePlayerBannerId: undefined,
  speakerTileText: "Вопросы спикерам",
  speakerTileBackgroundColor: "#1976d2",
  speakerTileTextColor: "#ffffff",
  speakerTileVisible: true,
  programTileText: "Программа",
  programTileBackgroundColor: "#6a1b9a",
  programTileTextColor: "#ffffff",
  programTileLinkUrl: "",
  programTileVisible: false,
  playerTilesOrder: [SPEAKER_TILE_ID, PROGRAM_TILE_ID],
  reactionsOverlayText: "Реакции аудитории",
  reactionsWidgets: [],
  reactionsWidgetStats: [],
  playerVisibleResultQuestionIds: [],
  playerVoteOptionTextColor: "#ffffff",
  playerVoteProgressTrackColor: "#6a5600",
  playerVoteProgressBarColor: "#fdd32a",
  projectorJoinQrVisible: DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  projectorJoinQrText: DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  projectorJoinQrTextColor: DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  randomizerMode: "names",
  randomizerListMode: "free_list",
  randomizerTitle: "Рандомайзер",
  randomizerNamesText: "",
  randomizerMinNumber: 1,
  randomizerMaxNumber: 100,
  randomizerWinnersCount: 1,
  randomizerExcludeWinners: true,
  randomizerSelectedWinners: [],
  randomizerCurrentWinners: [],
  randomizerHistory: [],
  randomizerRunId: 0,
  reportTitle: "Отчет мероприятия",
  reportModules: [
    "event_header",
    "participation_summary",
    "quiz_results",
    "vote_results",
    "reactions_summary",
    "randomizer_summary",
    "speaker_questions_summary",
  ],
  reportVoteQuestionIds: [],
  reportQuizQuestionIds: [],
  reportQuizSubQuizIds: [],
  reportSubQuizHideParticipantTableIds: [],
  reportRandomizerRunIds: [],
  reportReactionsWidgetIds: [],
  reportSpeakerQuestionIds: [],
  reportPublished: false,
  brandPrimaryColor: "#7c5acb",
  brandAccentColor: "#1976d2",
  brandSurfaceColor: "#ffffff",
  brandTextColor: "#1f1f1f",
  brandFontFamily: "Jost, Arial, sans-serif",
  brandFontUrl: "",
  brandLogoUrl: "",
  brandPlayerBackgroundImageUrl: "",
  brandProjectorBackgroundImageUrl: "",
  brandBodyBackgroundColor: "#000000",
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

/** Сравнение эталонных тегов и отображаемого тега: NFKC, регистр, пробелы, завершающая точка. Согласовано с сервером при зачёте ответов. */
export function normalizeTagComparable(value: string): string {
  let s = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").trim();
  s = s.replace(/\.+$/u, "").trim();
  return s;
}

function sanitizeCloudWords(
  items: CloudWordCount[] | undefined,
  minCount: number,
): CloudWordCount[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.text === "string" && item.text.trim().length > 0)
    .map((item) => ({
      text: item.text.trim().slice(0, 120),
      count: clampInt(item.count, minCount, 100000),
    }));
}

function sanitizeHex6(value: string | undefined, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())) return value.trim();
  return fallback;
}

function sanitizePalette(colors: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(colors) || colors.length !== 5) return [...fallback];
  return colors.map((color, index) => {
    if (typeof color !== "string" || color.trim().length === 0)
      return fallback[index] ?? fallback[0] ?? "#1f1f1f";
    return color;
  });
}

function sanitizeBrandFontFamily(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 200);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeBrandUrl(value: string | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1000);
}

function sanitizeBanners(items: PublicBanner[] | undefined): PublicBanner[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.id === "string")
    .map((item) => {
      const size: PublicBanner["size"] =
        item.size === "1x1" ? "1x1" : item.size === "full" ? "full" : "2x1";
      return {
        id: item.id.trim().slice(0, 80),
        linkUrl: typeof item.linkUrl === "string" ? item.linkUrl.trim().slice(0, 1000) : "",
        backgroundUrl:
          typeof item.backgroundUrl === "string" ? item.backgroundUrl.trim().slice(0, 1000) : "",
        size,
        isVisible: typeof item.isVisible === "boolean" ? item.isVisible : false,
      };
    })
    .filter(
      (item) => item.id.length > 0 && item.linkUrl.length > 0 && item.backgroundUrl.length > 0,
    )
    .slice(0, 50);
}

function sanitizeReactionWidgets(
  items: PublicReactionWidget[] | undefined,
): PublicReactionWidget[] {
  if (!Array.isArray(items)) return [];
  const dedupedIds = new Set<string>();
  const result: PublicReactionWidget[] = [];
  for (const item of items) {
    if (!item || typeof item.id !== "string") continue;
    const id = item.id.trim().slice(0, 80);
    if (!id || dedupedIds.has(id)) continue;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
    const reactions = Array.isArray(item.reactions)
      ? item.reactions
          .filter((reaction) => typeof reaction === "string")
          .map((reaction) => reaction.trim())
          .filter((reaction) => reaction.length > 0)
          .slice(0, 30)
      : [];
    if (reactions.length === 0) continue;
    dedupedIds.add(id);
    result.push({ id, title, reactions });
    if (result.length >= 100) break;
  }
  return result;
}

function sanitizeReactionWidgetStats(
  items: PublicReactionWidgetStats[] | undefined,
): PublicReactionWidgetStats[] {
  if (!Array.isArray(items)) return [];
  const deduped = new Set<string>();
  const result: PublicReactionWidgetStats[] = [];
  for (const item of items) {
    if (!item || typeof item.widgetId !== "string" || typeof item.counts !== "object") continue;
    const widgetId = item.widgetId.trim().slice(0, 80);
    if (!widgetId || deduped.has(widgetId)) continue;
    const counts: Record<string, number> = {};
    for (const [reaction, rawCount] of Object.entries(item.counts ?? {})) {
      const key = reaction.trim().slice(0, 16);
      if (!key) continue;
      const count = Number.isFinite(rawCount) ? Math.max(0, Math.trunc(rawCount)) : 0;
      counts[key] = count;
    }
    deduped.add(widgetId);
    result.push({ widgetId, counts });
    if (result.length >= 100) break;
  }
  return result;
}

function sanitizeRandomizerHistory(
  items: RandomizerHistoryEntry[] | undefined,
): RandomizerHistoryEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.timestamp === "string" && Array.isArray(item.winners))
    .map((item) => ({
      timestamp: item.timestamp.trim().slice(0, 80),
      winners: item.winners
        .filter((winner): winner is string => typeof winner === "string")
        .map((winner) => winner.trim())
        .filter((winner) => winner.length > 0)
        .slice(0, 50),
      mode: (item.mode === "numbers" ? "numbers" : "names") as RandomizerMode,
    }))
    .filter((item) => item.timestamp.length > 0 && item.winners.length > 0)
    .slice(0, 200);
}

function sanitizeReportModules(
  items: Array<ReportModuleId | "question_results"> | undefined,
  fallback: ReportModuleId[],
): ReportModuleId[] {
  const allowed = new Set<ReportModuleId>([
    "event_header",
    "participation_summary",
    "quiz_results",
    "vote_results",
    "reactions_summary",
    "randomizer_summary",
    "speaker_questions_summary",
  ]);
  if (!Array.isArray(items)) return [...fallback];
  const next: ReportModuleId[] = [];
  for (const item of items) {
    // Backward compatibility: old single block becomes two separated blocks.
    if (item === "question_results") {
      if (!next.includes("quiz_results")) next.push("quiz_results");
      if (!next.includes("vote_results")) next.push("vote_results");
      continue;
    }
    if (!allowed.has(item)) continue;
    if (!next.includes(item)) next.push(item);
  }
  if (next.length === 0) return [...fallback];
  return next.slice(0, 20);
}

export function normalizePublicViewState(
  value: Partial<PublicViewState> | undefined,
): PublicViewState {
  const base = DEFAULT_PUBLIC_VIEW_STATE;
  const mode =
    value?.mode === "question" ||
    value?.mode === "leaderboard" ||
    value?.mode === "title" ||
    value?.mode === "speaker_questions" ||
    value?.mode === "reactions" ||
    value?.mode === "randomizer" ||
    value?.mode === "report"
      ? value.mode
      : base.mode;
  const rawQuestionId =
    typeof value?.questionId === "string" && value.questionId.trim()
      ? value.questionId.trim()
      : undefined;
  const questionId = mode === "question" ? rawQuestionId : undefined;
  const questionRevealStage: QuestionRevealStage =
    value?.questionRevealStage === "results" || value?.questionRevealStage === "options"
      ? value.questionRevealStage
      : base.questionRevealStage;
  const playerBanners = sanitizeBanners(value?.playerBanners);
  const requestedActiveBannerId =
    typeof value?.activePlayerBannerId === "string" && value.activePlayerBannerId.trim()
      ? value.activePlayerBannerId.trim()
      : undefined;
  const activePlayerBannerId =
    requestedActiveBannerId && playerBanners.some((item) => item.id === requestedActiveBannerId)
      ? requestedActiveBannerId
      : undefined;
  const validTileIds = new Set<string>([
    SPEAKER_TILE_ID,
    PROGRAM_TILE_ID,
    ...playerBanners.map((x) => x.id),
  ]);
  const ordered = Array.isArray(value?.playerTilesOrder)
    ? value.playerTilesOrder
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && validTileIds.has(x))
    : [];
  const deduped: string[] = [];
  for (const id of ordered) {
    if (!deduped.includes(id)) deduped.push(id);
  }
  for (const banner of playerBanners) {
    if (!deduped.includes(banner.id)) deduped.push(banner.id);
  }
  if (!deduped.includes(SPEAKER_TILE_ID)) deduped.push(SPEAKER_TILE_ID);
  if (!deduped.includes(PROGRAM_TILE_ID)) deduped.push(PROGRAM_TILE_ID);
  return {
    mode,
    questionId,
    questionRevealStage,
    highlightedLeadersCount: clampInt(
      value?.highlightedLeadersCount ?? base.highlightedLeadersCount,
      0,
      100,
    ),
    showVoteCount:
      typeof value?.showVoteCount === "boolean" ? value.showVoteCount : base.showVoteCount,
    showCorrectOption:
      typeof value?.showCorrectOption === "boolean"
        ? value.showCorrectOption
        : base.showCorrectOption,
    showQuestionTitle:
      typeof value?.showQuestionTitle === "boolean"
        ? value.showQuestionTitle
        : base.showQuestionTitle,
    hiddenTagTexts: Array.isArray(value?.hiddenTagTexts)
      ? value.hiddenTagTexts
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim().slice(0, 120))
      : [...base.hiddenTagTexts],
    injectedTagWords: sanitizeCloudWords(value?.injectedTagWords, 1),
    tagCountOverrides: sanitizeCloudWords(value?.tagCountOverrides, 0),
    projectorBackground: sanitizeHex6(value?.projectorBackground, base.projectorBackground),
    cloudQuestionColor: sanitizeHex6(value?.cloudQuestionColor, base.cloudQuestionColor),
    cloudTagColors: sanitizePalette(value?.cloudTagColors, base.cloudTagColors),
    cloudTopTagColor: sanitizeHex6(value?.cloudTopTagColor, base.cloudTopTagColor),
    cloudCorrectTagColor: sanitizeHex6(value?.cloudCorrectTagColor, base.cloudCorrectTagColor),
    cloudDensity: clampInt(value?.cloudDensity ?? base.cloudDensity, 0, 100),
    cloudTagPadding: clampInt(value?.cloudTagPadding ?? base.cloudTagPadding, 0, 40),
    cloudSpiral:
      value?.cloudSpiral === "rectangular" || value?.cloudSpiral === "archimedean"
        ? value.cloudSpiral
        : base.cloudSpiral,
    cloudAnimationStrength: clampInt(
      value?.cloudAnimationStrength ?? base.cloudAnimationStrength,
      0,
      100,
    ),
    voteQuestionTextColor: sanitizeHex6(value?.voteQuestionTextColor, base.voteQuestionTextColor),
    voteOptionTextColor: sanitizeHex6(value?.voteOptionTextColor, base.voteOptionTextColor),
    voteProgressTrackColor: sanitizeHex6(
      value?.voteProgressTrackColor,
      base.voteProgressTrackColor,
    ),
    voteProgressBarColor: sanitizeHex6(value?.voteProgressBarColor, base.voteProgressBarColor),
    showFirstCorrectAnswerer:
      typeof value?.showFirstCorrectAnswerer === "boolean"
        ? value.showFirstCorrectAnswerer
        : base.showFirstCorrectAnswerer,
    firstCorrectWinnersCount: clampInt(
      value?.firstCorrectWinnersCount ?? base.firstCorrectWinnersCount,
      1,
      20,
    ),
    speakerQuestionsEnabled:
      typeof value?.speakerQuestionsEnabled === "boolean"
        ? value.speakerQuestionsEnabled
        : base.speakerQuestionsEnabled,
    speakerQuestionsSpeakers: Array.isArray(value?.speakerQuestionsSpeakers)
      ? value.speakerQuestionsSpeakers
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim().slice(0, 80))
          .slice(0, 100)
      : [...base.speakerQuestionsSpeakers],
    speakerQuestionsReactions: Array.isArray(value?.speakerQuestionsReactions)
      ? value.speakerQuestionsReactions
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 12)
      : [...base.speakerQuestionsReactions],
    speakerQuestionsShowAuthorOnScreen:
      typeof value?.speakerQuestionsShowAuthorOnScreen === "boolean"
        ? value.speakerQuestionsShowAuthorOnScreen
        : base.speakerQuestionsShowAuthorOnScreen,
    speakerQuestionsShowRecipientOnScreen:
      typeof value?.speakerQuestionsShowRecipientOnScreen === "boolean"
        ? value.speakerQuestionsShowRecipientOnScreen
        : base.speakerQuestionsShowRecipientOnScreen,
    speakerQuestionsShowReactionsOnScreen:
      typeof value?.speakerQuestionsShowReactionsOnScreen === "boolean"
        ? value.speakerQuestionsShowReactionsOnScreen
        : base.speakerQuestionsShowReactionsOnScreen,
    showEventTitleOnPlayer:
      typeof value?.showEventTitleOnPlayer === "boolean"
        ? value.showEventTitleOnPlayer
        : base.showEventTitleOnPlayer,
    playerBanners,
    activePlayerBannerId,
    speakerTileText:
      typeof value?.speakerTileText === "string"
        ? value.speakerTileText.trim().slice(0, 120)
        : base.speakerTileText,
    speakerTileBackgroundColor: sanitizeHex6(
      value?.speakerTileBackgroundColor,
      base.speakerTileBackgroundColor,
    ),
    speakerTileTextColor: sanitizeHex6(value?.speakerTileTextColor, base.speakerTileTextColor),
    speakerTileVisible:
      typeof value?.speakerTileVisible === "boolean"
        ? value.speakerTileVisible
        : base.speakerTileVisible,
    programTileText:
      typeof value?.programTileText === "string"
        ? value.programTileText.trim().slice(0, 120)
        : base.programTileText,
    programTileBackgroundColor: sanitizeHex6(
      value?.programTileBackgroundColor,
      base.programTileBackgroundColor,
    ),
    programTileTextColor: sanitizeHex6(value?.programTileTextColor, base.programTileTextColor),
    programTileLinkUrl:
      typeof value?.programTileLinkUrl === "string"
        ? value.programTileLinkUrl.trim().slice(0, 1000)
        : base.programTileLinkUrl,
    programTileVisible:
      typeof value?.programTileVisible === "boolean"
        ? value.programTileVisible
        : base.programTileVisible,
    playerTilesOrder: deduped,
    reactionsOverlayText:
      typeof value?.reactionsOverlayText === "string"
        ? value.reactionsOverlayText.trim().slice(0, 120)
        : base.reactionsOverlayText,
    reactionsWidgets: sanitizeReactionWidgets(value?.reactionsWidgets),
    reactionsWidgetStats: sanitizeReactionWidgetStats(value?.reactionsWidgetStats),
    playerVisibleResultQuestionIds: Array.isArray(value?.playerVisibleResultQuestionIds)
      ? value.playerVisibleResultQuestionIds
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 200)
      : [...base.playerVisibleResultQuestionIds],
    playerVoteOptionTextColor: sanitizeHex6(
      value?.playerVoteOptionTextColor,
      base.playerVoteOptionTextColor,
    ),
    playerVoteProgressTrackColor: sanitizeHex6(
      value?.playerVoteProgressTrackColor,
      base.playerVoteProgressTrackColor,
    ),
    playerVoteProgressBarColor: sanitizeHex6(
      value?.playerVoteProgressBarColor,
      base.playerVoteProgressBarColor,
    ),
    projectorJoinQrVisible:
      typeof value?.projectorJoinQrVisible === "boolean"
        ? value.projectorJoinQrVisible
        : base.projectorJoinQrVisible,
    projectorJoinQrText:
      typeof value?.projectorJoinQrText === "string"
        ? value.projectorJoinQrText.trim().slice(0, PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH)
        : base.projectorJoinQrText,
    projectorJoinQrTextColor: sanitizeHex6(
      value?.projectorJoinQrTextColor,
      base.projectorJoinQrTextColor,
    ),
    randomizerMode: value?.randomizerMode === "numbers" ? "numbers" : base.randomizerMode,
    randomizerListMode:
      value?.randomizerListMode === "participants_only"
        ? "participants_only"
        : base.randomizerListMode,
    randomizerTitle:
      typeof value?.randomizerTitle === "string"
        ? value.randomizerTitle.trim().slice(0, 120)
        : base.randomizerTitle,
    randomizerNamesText:
      typeof value?.randomizerNamesText === "string"
        ? value.randomizerNamesText.slice(0, 15000)
        : base.randomizerNamesText,
    randomizerMinNumber: clampInt(
      value?.randomizerMinNumber ?? base.randomizerMinNumber,
      -1000000,
      1000000,
    ),
    randomizerMaxNumber: clampInt(
      value?.randomizerMaxNumber ?? base.randomizerMaxNumber,
      -1000000,
      1000000,
    ),
    randomizerWinnersCount: clampInt(
      value?.randomizerWinnersCount ?? base.randomizerWinnersCount,
      1,
      500,
    ),
    randomizerExcludeWinners:
      typeof value?.randomizerExcludeWinners === "boolean"
        ? value.randomizerExcludeWinners
        : base.randomizerExcludeWinners,
    randomizerSelectedWinners: Array.isArray(value?.randomizerSelectedWinners)
      ? value.randomizerSelectedWinners
          .filter((winner): winner is string => typeof winner === "string")
          .map((winner) => winner.trim())
          .filter((winner) => winner.length > 0)
          .slice(0, 10000)
      : [...base.randomizerSelectedWinners],
    randomizerCurrentWinners: Array.isArray(value?.randomizerCurrentWinners)
      ? value.randomizerCurrentWinners
          .filter((winner): winner is string => typeof winner === "string")
          .map((winner) => winner.trim())
          .filter((winner) => winner.length > 0)
          .slice(0, 500)
      : [...base.randomizerCurrentWinners],
    randomizerHistory: sanitizeRandomizerHistory(value?.randomizerHistory),
    randomizerRunId: clampInt(value?.randomizerRunId ?? base.randomizerRunId, 0, 1000000000),
    reportTitle:
      typeof value?.reportTitle === "string"
        ? value.reportTitle.trim().slice(0, 120)
        : base.reportTitle,
    reportModules: sanitizeReportModules(value?.reportModules, base.reportModules),
    reportVoteQuestionIds: Array.isArray(value?.reportVoteQuestionIds)
      ? value.reportVoteQuestionIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 400)
      : [...base.reportVoteQuestionIds],
    reportQuizQuestionIds: Array.isArray(value?.reportQuizQuestionIds)
      ? value.reportQuizQuestionIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 400)
      : [...base.reportQuizQuestionIds],
    reportQuizSubQuizIds: Array.isArray(value?.reportQuizSubQuizIds)
      ? value.reportQuizSubQuizIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 400)
      : [...base.reportQuizSubQuizIds],
    reportSubQuizHideParticipantTableIds: Array.isArray(value?.reportSubQuizHideParticipantTableIds)
      ? value.reportSubQuizHideParticipantTableIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 400)
      : [...base.reportSubQuizHideParticipantTableIds],
    reportRandomizerRunIds: Array.isArray(value?.reportRandomizerRunIds)
      ? value.reportRandomizerRunIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id === "current" || /^history:\d{1,4}$/.test(id))
          .slice(0, 200)
      : [...base.reportRandomizerRunIds],
    reportReactionsWidgetIds: Array.isArray(value?.reportReactionsWidgetIds)
      ? value.reportReactionsWidgetIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 200)
      : [...base.reportReactionsWidgetIds],
    reportSpeakerQuestionIds: Array.isArray(value?.reportSpeakerQuestionIds)
      ? value.reportSpeakerQuestionIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 400)
      : [...base.reportSpeakerQuestionIds],
    reportPublished:
      typeof value?.reportPublished === "boolean" ? value.reportPublished : base.reportPublished,
    brandPrimaryColor: sanitizeHex6(value?.brandPrimaryColor, base.brandPrimaryColor),
    brandAccentColor: sanitizeHex6(value?.brandAccentColor, base.brandAccentColor),
    brandSurfaceColor: sanitizeHex6(value?.brandSurfaceColor, base.brandSurfaceColor),
    brandTextColor: sanitizeHex6(value?.brandTextColor, base.brandTextColor),
    brandFontFamily: sanitizeBrandFontFamily(value?.brandFontFamily, base.brandFontFamily),
    brandFontUrl: sanitizeBrandUrl(value?.brandFontUrl),
    brandLogoUrl: sanitizeBrandUrl(value?.brandLogoUrl),
    brandPlayerBackgroundImageUrl: sanitizeBrandUrl(
      value?.brandPlayerBackgroundImageUrl ?? value?.brandBackgroundImageUrl,
    ),
    brandProjectorBackgroundImageUrl: sanitizeBrandUrl(
      value?.brandProjectorBackgroundImageUrl ?? value?.brandBackgroundImageUrl,
    ),
    brandBodyBackgroundColor: sanitizeHex6(
      value?.brandBodyBackgroundColor,
      base.brandBodyBackgroundColor,
    ),
  };
}

export function mergePublicViewState(
  prev: PublicViewState,
  patch: PublicViewPatch,
): PublicViewState {
  const merged = normalizePublicViewState({ ...prev, ...patch });
  const nextMode = merged.mode;

  if (nextMode !== "question") {
    merged.questionId = undefined;
    merged.questionRevealStage = "options";
    return merged;
  }

  /** Явный непустой id в патче перезаписывает; иначе оставляем merged.questionId из normalize({ ...prev, ...patch }). */
  if (typeof patch.questionId === "string" && patch.questionId.trim()) {
    merged.questionId = patch.questionId.trim();
  }
  if (
    typeof patch.questionId === "string" &&
    patch.questionId.trim() &&
    patch.questionId.trim() !== prev.questionId &&
    patch.questionRevealStage === undefined
  ) {
    merged.questionRevealStage = "options";
  }
  return merged;
}
