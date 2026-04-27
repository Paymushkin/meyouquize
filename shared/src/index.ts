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
  | "reactions";
export type QuestionRevealStage = "options" | "results";

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
  /** Секция «Вопросы спикерам»: разрешить лайки от других участников */
  speakerQuestionsAllowLikes: boolean;
  /** Секция «Вопросы спикерам»: показывать лайки в режиме проектора */
  speakerQuestionsShowLikesOnScreen: boolean;
  /** Секция «Вопросы спикерам»: список доступных реакций */
  speakerQuestionsReactions: string[];
  /** Секция «Вопросы спикерам»: показывать автора вопроса в режиме проектора */
  speakerQuestionsShowAuthorOnScreen: boolean;
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
  /** Показывать плитку "Вопросы спикерам" у пользователя */
  speakerTileVisible: boolean;
  /** Текст кнопки "Программа" у пользователя */
  programTileText: string;
  /** Фоновый цвет кнопки "Программа" у пользователя */
  programTileBackgroundColor: string;
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
  /** Список questionId, для которых у пользователя показываются плитки результатов */
  playerVisibleResultQuestionIds: string[];
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
  /** Бренд: цвет оверлея поверх фонового изображения */
  brandBackgroundOverlayColor: string;
}

export interface PublicViewPayload extends PublicViewState {
  title?: string;
}

export type PublicViewPatch = Partial<PublicViewState> & {
  mode?: PublicViewMode;
  questionId?: string;
};

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
  speakerQuestionsAllowLikes: true,
  speakerQuestionsShowLikesOnScreen: true,
  speakerQuestionsReactions: ["👍", "🔥", "👏", "❤️"],
  speakerQuestionsShowAuthorOnScreen: false,
  showEventTitleOnPlayer: true,
  playerBanners: [],
  activePlayerBannerId: undefined,
  speakerTileText: "Вопросы спикерам",
  speakerTileBackgroundColor: "#1976d2",
  speakerTileVisible: true,
  programTileText: "Программа",
  programTileBackgroundColor: "#6a1b9a",
  programTileLinkUrl: "",
  programTileVisible: false,
  playerTilesOrder: [SPEAKER_TILE_ID, PROGRAM_TILE_ID],
  reactionsOverlayText: "Реакции аудитории",
  reactionsWidgets: [],
  playerVisibleResultQuestionIds: [],
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
  brandBackgroundOverlayColor: "#000000",
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

export function normalizePublicViewState(
  value: Partial<PublicViewState> | undefined,
): PublicViewState {
  const base = DEFAULT_PUBLIC_VIEW_STATE;
  const mode =
    value?.mode === "question" ||
    value?.mode === "leaderboard" ||
    value?.mode === "title" ||
    value?.mode === "speaker_questions" ||
    value?.mode === "reactions"
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
    speakerQuestionsAllowLikes:
      typeof value?.speakerQuestionsAllowLikes === "boolean"
        ? value.speakerQuestionsAllowLikes
        : base.speakerQuestionsAllowLikes,
    speakerQuestionsShowLikesOnScreen:
      typeof value?.speakerQuestionsShowLikesOnScreen === "boolean"
        ? value.speakerQuestionsShowLikesOnScreen
        : base.speakerQuestionsShowLikesOnScreen,
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
    playerVisibleResultQuestionIds: Array.isArray(value?.playerVisibleResultQuestionIds)
      ? value.playerVisibleResultQuestionIds
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 200)
      : [...base.playerVisibleResultQuestionIds],
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
    brandBackgroundOverlayColor: sanitizeHex6(
      value?.brandBackgroundOverlayColor,
      base.brandBackgroundOverlayColor,
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
