import {
  clampPhotoWallGridColumns,
  clampPhotoWallImageCount,
  sanitizePhotoWallBaseUrl,
  sanitizePhotoWallImageExt,
  type PhotoWallImageExt,
} from "./photoWall.js";
import type { BrandThemeId } from "./brandThemes.js";
import type { EventThemeBranding } from "./eventThemeBranding.js";
import {
  eventThemeBrandingToPublicViewPatch,
  sanitizeAppliedEventThemeKey,
  pickEventThemeBrandingFromPublicView,
} from "./eventThemeBranding.js";
import { sanitizeBrandThemeId } from "./brandThemes.js";
import {
  migrateLegacyTagCloudManualIntoMap,
  withProjectorTagCloudFields,
  type TagCloudManualByQuestionId,
  type TagCloudQuestionManualState,
  type OptionVoteCountOverride,
} from "./tagCloudManual.js";
import {
  filterMediaBrandFontUrls,
  isBuiltinBrandFontFamily,
  isMediaBrandFontUrl,
  sanitizeBrandFontUrls,
} from "./brandFontFaces.js";
import { sanitizeVoteOptionBorderColor } from "./voteOptionBorderColor.js";
import { sanitizeVoteFillColor, sanitizeVoteQuestionTextColor } from "./voteQuestionTextStyle.js";

export type QuestionType = "single" | "multi" | "tag_cloud" | "ranking" | "temperature";
export type QuizStatus = "draft" | "live" | "finished";
export const SPEAKER_TILE_ID = "speaker_tile";
export const PROGRAM_TILE_ID = "program_tile";
export const PHOTO_WALL_TILE_ID = "photo_wall_tile";
/** Плитка 1×1 «Мой квиз» с личным отчётом по сабквизу в интерфейсе игрока */
export const QUIZ_RESULTS_TILE_ID = "quiz_results_tile";

/** Id плитки отчёта для конкретного сабквиза: `quiz_results_tile:<subQuizId>`. */
export function quizResultsTileIdForSubQuiz(subQuizId: string): string {
  return `${QUIZ_RESULTS_TILE_ID}:${subQuizId.trim()}`;
}

export function isQuizResultsTileId(tileId: string): boolean {
  return tileId === QUIZ_RESULTS_TILE_ID || tileId.startsWith(`${QUIZ_RESULTS_TILE_ID}:`);
}

/** `null` для устаревшей единственной плитки `quiz_results_tile` без суффикса. */
export function parseQuizResultsSubQuizIdFromTileId(tileId: string): string | null {
  if (tileId === QUIZ_RESULTS_TILE_ID) return null;
  const prefix = `${QUIZ_RESULTS_TILE_ID}:`;
  if (!tileId.startsWith(prefix)) return null;
  const id = tileId.slice(prefix.length).trim();
  return id.length > 0 ? id.slice(0, 80) : null;
}

function sanitizeSubQuizIdList(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim().slice(0, 80);
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** Убирает плитки отчёта из середины списка и ставит их в конец (порядок сохраняется). */
export function withQuizResultsTileLast(tileIds: string[]): string[] {
  const rest = tileIds.filter((id) => !isQuizResultsTileId(id));
  const quizTiles: string[] = [];
  for (const id of tileIds) {
    if (!isQuizResultsTileId(id)) continue;
    if (!quizTiles.includes(id)) quizTiles.push(id);
  }
  return [...rest, ...quizTiles];
}

export interface OptionInput {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  /** Для temperature: вес варианта 0–100. */
  weight?: number;
}

export interface QuestionInput {
  text: string;
  type: QuestionType;
  points: number;
  maxAnswers?: number;
  imageUrl?: string;
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
  | "photo_wall"
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
  | "feedback_summary"
  | "randomizer_summary"
  | "speaker_questions_summary"
  | "banners_summary";

export type CloudWordCount = { text: string; count: number };

export type {
  TagCloudQuestionManualState,
  TagCloudManualByQuestionId,
  OptionVoteCountOverride,
} from "./tagCloudManual.js";
export {
  EMPTY_TAG_CLOUD_QUESTION_MANUAL,
  hasTagCloudManualContent,
  migrateLegacyTagCloudManualIntoMap,
  resolveTagCloudManualForQuestion,
  withProjectorTagCloudFields,
  resolveOptionDisplayCount,
  hasOptionVoteCountOverride,
  applyOptionVoteCountOverrides,
  applyQuestionResultManualDisplay,
} from "./tagCloudManual.js";
export { buildCloudWordsForDisplay, aggregateTagCloudWordCounts } from "./tagCloudMerge.js";
export type {
  PhotoWallImageExt,
  PhotoWallAlbumPhoto,
  PhotoWallCollageLayout,
  PhotoWallCollageGridCell,
} from "./photoWall.js";
export {
  PHOTO_WALL_MAX_IMAGE_COUNT,
  PHOTO_WALL_DEFAULT_IMAGE_EXT,
  PHOTO_WALL_PHOTO_WIDTH,
  PHOTO_WALL_PHOTO_HEIGHT,
  PHOTO_WALL_WATERFALL_MIN_TILES_PER_COLUMN,
  PHOTO_WALL_COLLAGE_PHOTO_COUNT,
  PHOTO_WALL_COLLAGE_GAP_PX,
  PHOTO_WALL_INSERT_INTERVAL_MS,
  PHOTO_WALL_INSERT_RETRY_MS,
  PHOTO_WALL_INSERT_DURATION_MS,
  buildPhotoWallAlbumPhotos,
  buildPhotoWallImageUrl,
  buildPhotoWallWaterfallColumnPhotos,
  clampPhotoWallGridColumns,
  clampPhotoWallImageCount,
  photoWallCollagePhotoIndices,
  resolvePhotoWallCollageLayout,
  photoWallKenBurnsVariant,
  photoWallColumnPhotoIndices,
  photoWallPickInsertPhotoIndex,
  photoWallSlotPhotoIndex,
  photoWallTileAspectRatio,
  photoWallWaterfallScrollDurationSec,
  resolvePhotoWallColumnCount,
  sanitizePhotoWallBaseUrl,
  sanitizePhotoWallImageExt,
} from "./photoWall.js";
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
export type PublicBannerClickStats = {
  bannerId: string;
  uniqueClicks: number;
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
  /** Сабквиз для режима `leaderboard` на проекторе (пусто = первый по sortOrder). */
  leaderboardSubQuizId: string;
  showVoteCount: boolean;
  /** Показывать подсветку правильного ответа в вариантах на проекторе */
  showCorrectOption: boolean;
  showQuestionTitle: boolean;
  hiddenTagTexts: string[];
  injectedTagWords: CloudWordCount[];
  tagCountOverrides: CloudWordCount[];
  /** Ручные теги облака по questionId (сохраняются на сервере между перезапусками). */
  tagCloudManualByQuestionId: TagCloudManualByQuestionId;
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
  /** Бордер плиток вариантов на проекторе (этап «варианты»): #hex или rgba(...). */
  voteOptionBorderColor: string;
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
  /** Разрешить в форме игрока вариант «Всем спикерам» */
  speakerQuestionsAllowAllSpeakersTarget: boolean;
  /** Показывать название ивента в интерфейсе игрока */
  showEventTitleOnPlayer: boolean;
  /** Вход в ивент без формы: сразу случайный ник (пользователь может сменить позже). */
  playerAutoJoinRandomNickname: boolean;
  /** Баннеры для пользовательского интерфейса */
  playerBanners: PublicBanner[];
  /** Уникальные клики по баннерам (для админки). */
  playerBannerClickStats: PublicBannerClickStats[];
  /** Участники, уже кликнувшие по баннеру (для дедупликации, только сервер/админка). */
  playerBannerClickParticipantIds: Record<string, string[]>;
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
  /** Показывать плитку фотостены (коллаж) у пользователя */
  photoWallTileVisible: boolean;
  /** Плитка 1×1 с личным отчётом по квизу (сабквиз) */
  playerQuizResultsTileVisible: boolean;
  playerQuizResultsTileText: string;
  playerQuizResultsTileBackgroundColor: string;
  playerQuizResultsTileTextColor: string;
  /** Пусто = первый сабквиз по sortOrder; иначе id сабквиза для отчёта (legacy) */
  playerQuizResultsSubQuizId: string;
  /** Сабквизы, для которых у игрока показана плитка личного отчёта */
  playerQuizResultsSubQuizIds: string[];
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
  /** Проектор: крупный QR на экране ивента (title) */
  projectorJoinQrVisible: boolean;
  /** Проектор: компактный QR в углу на голосованиях и других экранах */
  projectorJoinQrOverlayVisible: boolean;
  /** Проектор: подпись рядом с QR-кодом входа */
  projectorJoinQrText: string;
  projectorJoinQrTextColor: string;
  /** Проектор: размер компактного QR на экранах контента (px) */
  projectorJoinQrOverlaySizePx: number;
  /** Проектор: отступ компактного QR от верхнего/нижнего края (px) */
  projectorJoinQrOverlayInsetVerticalPx: number;
  /** Проектор: отступ компактного QR от левого/правого края (px) */
  projectorJoinQrOverlayInsetHorizontalPx: number;
  /** @deprecated используйте vertical/horizontal; оставлено для миграции */
  projectorJoinQrOverlayInsetPx: number;
  /** Проектор: угол размещения компактного QR */
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
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
  /**
   * Рандомайзер: snapshot пула для анимации перебора на проекторе
   * (нужен в режиме «только участники», когда randomizerNamesText пуст).
   */
  randomizerAnimationPool: string[];
  /** Рандомайзер: история запусков */
  randomizerHistory: RandomizerHistoryEntry[];
  /** Рандомайзер: счётчик запусков (триггер анимации на проекторе) */
  randomizerRunId: number;
  /** Фотостена: HTTPS-префикс папки в object storage (с / в конце) */
  photoWallBaseUrl: string;
  /** Фотостена: число файлов 1..N в папке */
  photoWallImageCount: number;
  photoWallImageExt: PhotoWallImageExt;
  /** 0 = auto-fill по ширине экрана */
  photoWallGridColumns: number;
  photoWallAnimate: boolean;
  photoWallKenBurns: boolean;
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
  /** Отчет: какие формы обратной связи показывать (id). Пусто = все с ответами. */
  reportFeedbackFormIds: string[];
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
  /** Бренд: цвет текста и обводки инпутов в формах игрока */
  brandInputTextColor: string;
  /** Бренд: семейство шрифта */
  brandFontFamily: string;
  /** Бренд: URL файла кастомного шрифта (если используется) */
  brandFontUrl: string;
  /** Бренд: все URL начертаний выбранного семейства (снимок). */
  brandFontUrls?: string[];
  /** Бренд: URL логотипа */
  brandLogoUrl: string;
  /** Бренд: URL фона интерфейса игрока */
  brandPlayerBackgroundImageUrl: string;
  /** Бренд: URL фона проектора */
  brandProjectorBackgroundImageUrl: string;
  /** Бренд: цвет фона body (внешняя область страницы игрока) */
  brandBodyBackgroundColor: string;
  /** Пресет оформления: стандартный или MeYOU (как demo, только визуал). */
  brandTheme?: BrandThemeId;
  /** Метка последней применённой темы (только для UI, без синхронизации). */
  appliedEventThemeName?: string;
  /** Ключ выбора темы в админке: default | meyou | custom:{id}. */
  appliedEventThemeKey?: string;
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

export const DEFAULT_PROJECTOR_JOIN_QR_VISIBLE = false;
export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE = false;
export const PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH = 200;
export const DEFAULT_PROJECTOR_JOIN_QR_TEXT = "Сканируйте QR-код, чтобы войти в ивент";
export const DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR = "#ffffff";

export type ProjectorJoinQrOverlayCorner =
  | "top_right"
  | "top_left"
  | "bottom_right"
  | "bottom_left";

export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX = 150;
export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX = 30;
export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX = 30;
/** @deprecated */
export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX = 30;
export const DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER: ProjectorJoinQrOverlayCorner = "top_right";

export const PROJECTOR_JOIN_QR_OVERLAY_CORNERS: ProjectorJoinQrOverlayCorner[] = [
  "top_right",
  "top_left",
  "bottom_right",
  "bottom_left",
];

function sanitizeProjectorJoinQrOverlayCorner(
  value: unknown,
  fallback: ProjectorJoinQrOverlayCorner,
): ProjectorJoinQrOverlayCorner {
  if (
    value === "top_right" ||
    value === "top_left" ||
    value === "bottom_right" ||
    value === "bottom_left"
  ) {
    return value;
  }
  return fallback;
}

export const DEFAULT_PUBLIC_VIEW_STATE: PublicViewState = {
  mode: "title",
  questionRevealStage: "options",
  highlightedLeadersCount: 3,
  leaderboardSubQuizId: "",
  showVoteCount: false,
  showCorrectOption: false,
  showQuestionTitle: true,
  hiddenTagTexts: [],
  injectedTagWords: [],
  tagCountOverrides: [],
  tagCloudManualByQuestionId: {},
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
  voteOptionBorderColor: "rgba(255,255,255,0.4)",
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
  speakerQuestionsAllowAllSpeakersTarget: true,
  showEventTitleOnPlayer: true,
  playerAutoJoinRandomNickname: false,
  playerBanners: [],
  playerBannerClickStats: [],
  playerBannerClickParticipantIds: {},
  activePlayerBannerId: undefined,
  speakerTileText: "Вопросы спикерам",
  speakerTileBackgroundColor: "#1976d2",
  speakerTileTextColor: "#ffffff",
  speakerTileVisible: false,
  programTileText: "Программа",
  programTileBackgroundColor: "#6a1b9a",
  programTileTextColor: "#ffffff",
  programTileLinkUrl: "",
  programTileVisible: false,
  photoWallTileVisible: false,
  playerQuizResultsTileVisible: false,
  playerQuizResultsTileText: "Мой квиз",
  playerQuizResultsTileBackgroundColor: "#2e7d32",
  playerQuizResultsTileTextColor: "#ffffff",
  playerQuizResultsSubQuizId: "",
  playerQuizResultsSubQuizIds: [],
  playerTilesOrder: [SPEAKER_TILE_ID, PROGRAM_TILE_ID, PHOTO_WALL_TILE_ID],
  reactionsOverlayText: "Реакции аудитории",
  reactionsWidgets: [],
  reactionsWidgetStats: [],
  playerVisibleResultQuestionIds: [],
  playerVoteOptionTextColor: "#ffffff",
  playerVoteProgressTrackColor: "#6a5600",
  playerVoteProgressBarColor: "#F3F722",
  projectorJoinQrVisible: DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  projectorJoinQrOverlayVisible: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE,
  projectorJoinQrText: DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  projectorJoinQrTextColor: DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  projectorJoinQrOverlaySizePx: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  projectorJoinQrOverlayInsetVerticalPx: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX,
  projectorJoinQrOverlayInsetHorizontalPx: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX,
  projectorJoinQrOverlayInsetPx: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  projectorJoinQrOverlayCorner: DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
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
  randomizerAnimationPool: [],
  randomizerHistory: [],
  randomizerRunId: 0,
  photoWallBaseUrl: "",
  photoWallImageCount: 0,
  photoWallImageExt: "jpg",
  photoWallGridColumns: 0,
  photoWallAnimate: true,
  photoWallKenBurns: true,
  reportTitle: "Отчет мероприятия",
  reportModules: [
    "event_header",
    "participation_summary",
    "quiz_results",
    "vote_results",
    "reactions_summary",
    "feedback_summary",
    "randomizer_summary",
    "speaker_questions_summary",
    "banners_summary",
  ],
  reportVoteQuestionIds: [],
  reportQuizQuestionIds: [],
  reportQuizSubQuizIds: [],
  reportSubQuizHideParticipantTableIds: [],
  reportRandomizerRunIds: [],
  reportReactionsWidgetIds: [],
  reportSpeakerQuestionIds: [],
  reportFeedbackFormIds: [],
  reportPublished: false,
  brandPrimaryColor: "#7c5acb",
  brandAccentColor: "#1976d2",
  brandSurfaceColor: "#ffffff",
  brandTextColor: "#1f1f1f",
  brandInputTextColor: "#ffffff",
  brandFontFamily: "Jost, Arial, sans-serif",
  brandFontUrl: "",
  brandLogoUrl: "",
  brandPlayerBackgroundImageUrl: "",
  brandProjectorBackgroundImageUrl: "",
  brandBodyBackgroundColor: "#000000",
  brandTheme: "default",
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export { normalizeTagComparable } from "./tagCloudText.js";
import { normalizeTagComparable } from "./tagCloudText.js";

/** Синонимы в одной строке эталона: «синий; голубой» или «синий, голубой». */
export function parseTagCloudReferenceAliases(optionText: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of optionText.split(/[;|,]/u)) {
    const norm = normalizeTagComparable(part);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

export function tagMatchesReferenceAliases(userComparable: string, optionText: string): boolean {
  if (!userComparable) return false;
  return parseTagCloudReferenceAliases(optionText).includes(userComparable);
}

/** Разбивает ввод участника (одно поле может содержать «а; б, в»). */
export function splitTagCloudUserInput(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[;|,]/u)) {
    const norm = normalizeTagComparable(part);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/** Несколько полей ответа → плоский список нормализованных тегов. */
export function expandTagCloudSubmitLines(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = splitTagCloudUserInput(trimmed);
    const tags = parts.length > 0 ? parts : [normalizeTagComparable(trimmed)].filter(Boolean);
    for (const tag of tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** JSON из `answer.selectedOptionIds` для облака тегов. */
export function parseStoredTagAnswersJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      for (const tag of splitTagCloudUserInput(item)) {
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        out.push(tag);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Все нормализованные синонимы эталонных тегов вопроса (только `isCorrect`). */
export function collectTagCloudCorrectAliases(
  options: Array<{ text: string; isCorrect: boolean }>,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const o of options) {
    if (!o.isCorrect) continue;
    for (const alias of parseTagCloudReferenceAliases(o.text)) {
      if (!seen.has(alias)) {
        seen.add(alias);
        out.push(alias);
      }
    }
  }
  return out;
}

/** Все эталонные строки квиза: каждый непустой вариант — отдельный эталон. */
export function collectTagCloudQuizReferenceAliases(options: Array<{ text: string }>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const o of options) {
    if (!o.text.trim()) continue;
    for (const alias of parseTagCloudReferenceAliases(o.text)) {
      if (!seen.has(alias)) {
        seen.add(alias);
        out.push(alias);
      }
    }
  }
  return out;
}

/** Текст «верного ответа» для отчёта участника. */
export function formatTagCloudReferenceAnswer(
  options: Array<{ text: string; isCorrect: boolean }>,
  mode: "quiz" | "poll",
): string {
  const reference =
    mode === "quiz"
      ? options.filter((o) => o.text.trim())
      : options.filter((o) => o.isCorrect && o.text.trim());
  if (reference.length === 0) return "—";
  return reference
    .map((o) => {
      const aliases = parseTagCloudReferenceAliases(o.text);
      return aliases.length > 0 ? aliases.join(" / ") : o.text.trim();
    })
    .join(" · ");
}

/** Подпись баллов с правильным склонением («1 балл», «2 балла», «5 баллов»). */
export function ruBallLabel(n: number): string {
  const v = Math.abs(Math.trunc(n));
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} баллов`;
  const mod10 = v % 10;
  if (mod10 === 1) return `${n} балл`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} балла`;
  return `${n} баллов`;
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

function sanitizeHiddenTagTexts(items: string[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 120));
}

function sanitizeOptionVoteCountOverrides(
  items: OptionVoteCountOverride[] | undefined,
): OptionVoteCountOverride[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.text === "string" && item.text.trim().length > 0)
    .map((item) => {
      const mode =
        item.mode === "delta" ? "delta" : item.mode === "absolute" ? "absolute" : undefined;
      const minCount = mode === "delta" ? -100000 : 0;
      return {
        text: item.text.trim().slice(0, 80),
        count: clampInt(item.count, minCount, 100000),
        ...(mode ? { mode } : {}),
      };
    });
}

function sanitizeTagCloudQuestionManualState(value: unknown): TagCloudQuestionManualState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<TagCloudQuestionManualState>;
  const hiddenTagTexts = sanitizeHiddenTagTexts(row.hiddenTagTexts);
  const injectedTagWords = sanitizeCloudWords(row.injectedTagWords, 1);
  const tagCountOverrides = sanitizeCloudWords(row.tagCountOverrides, 0);
  const optionVoteCountOverrides = sanitizeOptionVoteCountOverrides(row.optionVoteCountOverrides);
  if (
    hiddenTagTexts.length === 0 &&
    injectedTagWords.length === 0 &&
    tagCountOverrides.length === 0 &&
    optionVoteCountOverrides.length === 0
  ) {
    return null;
  }
  return { hiddenTagTexts, injectedTagWords, tagCountOverrides, optionVoteCountOverrides };
}

export function sanitizeTagCloudManualByQuestionId(value: unknown): TagCloudManualByQuestionId {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: TagCloudManualByQuestionId = {};
  for (const [key, raw] of Object.entries(value)) {
    const questionId = key.trim().slice(0, 80);
    if (!questionId) continue;
    const state = sanitizeTagCloudQuestionManualState(raw);
    if (state) out[questionId] = state;
  }
  return out;
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

const BARE_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function extractMailtoAddress(mailtoUrl: string): string {
  try {
    const u = new URL(mailtoUrl);
    if (u.protocol !== "mailto:") return "";
    const raw = (u.pathname || u.href.replace(/^mailto:/i, "")).split("?")[0] ?? "";
    return decodeURIComponent(raw).trim();
  } catch {
    return "";
  }
}

/** Пустая строка, если значение не http(s), mailto: или адрес почты. */
export function sanitizeBannerLinkUrl(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const v = value.trim().slice(0, 1000);
  if (!v) return "";

  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return v;
    if (u.protocol === "mailto:" && BARE_EMAIL_RE.test(extractMailtoAddress(v))) {
      return v;
    }
  } catch {
    /* ignore */
  }

  if (BARE_EMAIL_RE.test(v)) {
    return `mailto:${v}`;
  }

  return "";
}

export function isValidBannerLinkUrl(value: string): boolean {
  return sanitizeBannerLinkUrl(value).length > 0;
}

/** Пустая строка, если значение не абсолютный http(s) URL (для Zod optionalExternalHttpUrl). */
export function sanitizeExternalHttpUrl(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const v = value.trim().slice(0, 1000);
  if (!v) return "";
  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return v;
  } catch {
    /* ignore */
  }
  return "";
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
        linkUrl: sanitizeBannerLinkUrl(typeof item.linkUrl === "string" ? item.linkUrl : undefined),
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

function sanitizeBannerClickStats(
  items: PublicBannerClickStats[] | undefined,
): PublicBannerClickStats[] {
  if (!Array.isArray(items)) return [];
  const deduped = new Set<string>();
  const result: PublicBannerClickStats[] = [];
  for (const item of items) {
    if (!item || typeof item.bannerId !== "string") continue;
    const bannerId = item.bannerId.trim().slice(0, 80);
    if (!bannerId || deduped.has(bannerId)) continue;
    const uniqueClicks = Number.isFinite(item.uniqueClicks)
      ? Math.max(0, Math.trunc(item.uniqueClicks))
      : 0;
    deduped.add(bannerId);
    result.push({ bannerId, uniqueClicks });
    if (result.length >= 50) break;
  }
  return result;
}

function sanitizeBannerClickParticipantIds(
  value: Record<string, string[]> | undefined,
): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [rawBannerId, rawIds] of Object.entries(value)) {
    const bannerId = rawBannerId.trim().slice(0, 80);
    if (!bannerId || !Array.isArray(rawIds)) continue;
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const rawId of rawIds) {
      if (typeof rawId !== "string") continue;
      const participantId = rawId.trim().slice(0, 80);
      if (!participantId || seen.has(participantId)) continue;
      seen.add(participantId);
      ids.push(participantId);
      if (ids.length >= 10_000) break;
    }
    if (ids.length > 0) result[bannerId] = ids;
  }
  return result;
}

function pruneBannerClickData(
  banners: PublicBanner[],
  stats: PublicBannerClickStats[],
  participantIds: Record<string, string[]>,
): {
  playerBannerClickStats: PublicBannerClickStats[];
  playerBannerClickParticipantIds: Record<string, string[]>;
} {
  const bannerIds = new Set(banners.map((banner) => banner.id));
  const prunedParticipants: Record<string, string[]> = {};
  for (const [bannerId, ids] of Object.entries(participantIds)) {
    if (bannerIds.has(bannerId)) prunedParticipants[bannerId] = ids;
  }
  const prunedStats = stats
    .filter((row) => bannerIds.has(row.bannerId))
    .map((row) => ({
      bannerId: row.bannerId,
      uniqueClicks: Math.min(
        row.uniqueClicks,
        prunedParticipants[row.bannerId]?.length ?? row.uniqueClicks,
      ),
    }));
  for (const bannerId of bannerIds) {
    if (prunedStats.some((row) => row.bannerId === bannerId)) continue;
    const ids = prunedParticipants[bannerId];
    if (ids && ids.length > 0) {
      prunedStats.push({ bannerId, uniqueClicks: ids.length });
    }
  }
  return {
    playerBannerClickStats: prunedStats,
    playerBannerClickParticipantIds: prunedParticipants,
  };
}

export function resolveBannerUniqueClicks(
  stats: PublicBannerClickStats[] | undefined,
  bannerId: string,
): number {
  const row = stats?.find((item) => item.bannerId === bannerId);
  return row?.uniqueClicks ?? 0;
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

/** Новые модули отчёта для событий, сохранённых до их появления в дефолте. */
const REPORT_MODULE_BACKFILL: ReportModuleId[] = ["banners_summary"];

export function backfillReportModules(
  modules: ReportModuleId[],
  fallback: ReportModuleId[],
): ReportModuleId[] {
  let result = [...modules];
  for (const moduleId of REPORT_MODULE_BACKFILL) {
    if (!fallback.includes(moduleId) || result.includes(moduleId)) continue;
    result = [...result, moduleId];
  }
  return result.slice(0, 20);
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
    "feedback_summary",
    "randomizer_summary",
    "speaker_questions_summary",
    "banners_summary",
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
  return backfillReportModules(next, fallback);
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
    value?.mode === "photo_wall" ||
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
  const bannerClickData = pruneBannerClickData(
    playerBanners,
    sanitizeBannerClickStats(value?.playerBannerClickStats),
    sanitizeBannerClickParticipantIds(value?.playerBannerClickParticipantIds),
  );
  const requestedActiveBannerId =
    typeof value?.activePlayerBannerId === "string" && value.activePlayerBannerId.trim()
      ? value.activePlayerBannerId.trim()
      : undefined;
  const activePlayerBannerId =
    requestedActiveBannerId && playerBanners.some((item) => item.id === requestedActiveBannerId)
      ? requestedActiveBannerId
      : undefined;
  const isAllowedTileId = (id: string) =>
    id === SPEAKER_TILE_ID ||
    id === PROGRAM_TILE_ID ||
    id === PHOTO_WALL_TILE_ID ||
    id === QUIZ_RESULTS_TILE_ID ||
    isQuizResultsTileId(id) ||
    playerBanners.some((x) => x.id === id);
  const ordered = Array.isArray(value?.playerTilesOrder)
    ? value.playerTilesOrder
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length <= 120 && isAllowedTileId(x))
    : [];
  const deduped: string[] = [];
  const quizResultTiles: string[] = [];
  for (const id of ordered) {
    if (isQuizResultsTileId(id)) {
      if (!quizResultTiles.includes(id)) quizResultTiles.push(id);
      continue;
    }
    if (!deduped.includes(id)) deduped.push(id);
  }
  for (const banner of playerBanners) {
    if (!deduped.includes(banner.id)) deduped.push(banner.id);
  }
  if (!deduped.includes(SPEAKER_TILE_ID)) deduped.push(SPEAKER_TILE_ID);
  if (!deduped.includes(PROGRAM_TILE_ID)) deduped.push(PROGRAM_TILE_ID);
  if (!deduped.includes(PHOTO_WALL_TILE_ID)) deduped.push(PHOTO_WALL_TILE_ID);
  let playerQuizResultsSubQuizIds = sanitizeSubQuizIdList(value?.playerQuizResultsSubQuizIds, 20);
  const legacyReportVisible =
    typeof value?.playerQuizResultsTileVisible === "boolean"
      ? value.playerQuizResultsTileVisible
      : base.playerQuizResultsTileVisible;
  if (playerQuizResultsSubQuizIds.length === 0 && legacyReportVisible) {
    const legacyId =
      typeof value?.playerQuizResultsSubQuizId === "string"
        ? value.playerQuizResultsSubQuizId.trim().slice(0, 80)
        : base.playerQuizResultsSubQuizId.trim();
    if (legacyId) playerQuizResultsSubQuizIds = [legacyId];
  }
  if (quizResultTiles.length === 0 && playerQuizResultsSubQuizIds.length > 0) {
    for (const sqId of playerQuizResultsSubQuizIds) {
      const tileId = quizResultsTileIdForSubQuiz(sqId);
      if (!quizResultTiles.includes(tileId)) quizResultTiles.push(tileId);
    }
  } else if (
    quizResultTiles.length === 1 &&
    quizResultTiles[0] === QUIZ_RESULTS_TILE_ID &&
    playerQuizResultsSubQuizIds.length === 1
  ) {
    quizResultTiles[0] = quizResultsTileIdForSubQuiz(playerQuizResultsSubQuizIds[0]!);
  }
  const dedupedTilesOrder = withQuizResultsTileLast([...deduped, ...quizResultTiles]);
  return {
    mode,
    questionId,
    questionRevealStage,
    highlightedLeadersCount: clampInt(
      value?.highlightedLeadersCount ?? base.highlightedLeadersCount,
      0,
      100,
    ),
    leaderboardSubQuizId:
      typeof value?.leaderboardSubQuizId === "string"
        ? value.leaderboardSubQuizId.trim().slice(0, 80)
        : base.leaderboardSubQuizId,
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
    tagCloudManualByQuestionId: migrateLegacyTagCloudManualIntoMap(
      sanitizeTagCloudManualByQuestionId(
        value?.tagCloudManualByQuestionId ?? base.tagCloudManualByQuestionId,
      ),
      {
        questionId: typeof value?.questionId === "string" ? value.questionId : undefined,
        hiddenTagTexts: Array.isArray(value?.hiddenTagTexts) ? value.hiddenTagTexts : undefined,
        injectedTagWords: Array.isArray(value?.injectedTagWords)
          ? value.injectedTagWords
          : undefined,
        tagCountOverrides: Array.isArray(value?.tagCountOverrides)
          ? value.tagCountOverrides
          : undefined,
      },
    ),
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
    voteQuestionTextColor: sanitizeVoteQuestionTextColor(
      value?.voteQuestionTextColor,
      base.voteQuestionTextColor,
    ),
    voteOptionTextColor: sanitizeHex6(value?.voteOptionTextColor, base.voteOptionTextColor),
    voteOptionBorderColor: sanitizeVoteOptionBorderColor(
      value?.voteOptionBorderColor,
      base.voteOptionBorderColor,
    ),
    voteProgressTrackColor: sanitizeHex6(
      value?.voteProgressTrackColor,
      base.voteProgressTrackColor,
    ),
    voteProgressBarColor: sanitizeVoteFillColor(
      value?.voteProgressBarColor,
      base.voteProgressBarColor,
    ),
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
    speakerQuestionsAllowAllSpeakersTarget:
      typeof value?.speakerQuestionsAllowAllSpeakersTarget === "boolean"
        ? value.speakerQuestionsAllowAllSpeakersTarget
        : base.speakerQuestionsAllowAllSpeakersTarget,
    showEventTitleOnPlayer:
      typeof value?.showEventTitleOnPlayer === "boolean"
        ? value.showEventTitleOnPlayer
        : base.showEventTitleOnPlayer,
    playerAutoJoinRandomNickname:
      typeof value?.playerAutoJoinRandomNickname === "boolean"
        ? value.playerAutoJoinRandomNickname
        : base.playerAutoJoinRandomNickname,
    playerBanners,
    playerBannerClickStats: bannerClickData.playerBannerClickStats,
    playerBannerClickParticipantIds: bannerClickData.playerBannerClickParticipantIds,
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
    programTileLinkUrl: sanitizeExternalHttpUrl(
      typeof value?.programTileLinkUrl === "string"
        ? value.programTileLinkUrl
        : base.programTileLinkUrl,
    ),
    programTileVisible:
      typeof value?.programTileVisible === "boolean"
        ? value.programTileVisible
        : base.programTileVisible,
    photoWallTileVisible:
      typeof value?.photoWallTileVisible === "boolean"
        ? value.photoWallTileVisible
        : base.photoWallTileVisible,
    playerQuizResultsTileText:
      typeof value?.playerQuizResultsTileText === "string"
        ? value.playerQuizResultsTileText.trim().slice(0, 120)
        : base.playerQuizResultsTileText,
    playerQuizResultsTileBackgroundColor: sanitizeHex6(
      value?.playerQuizResultsTileBackgroundColor,
      base.playerQuizResultsTileBackgroundColor,
    ),
    playerQuizResultsTileTextColor: sanitizeHex6(
      value?.playerQuizResultsTileTextColor,
      base.playerQuizResultsTileTextColor,
    ),
    playerQuizResultsSubQuizIds,
    playerQuizResultsSubQuizId:
      playerQuizResultsSubQuizIds[0] ??
      (typeof value?.playerQuizResultsSubQuizId === "string"
        ? value.playerQuizResultsSubQuizId.trim().slice(0, 80)
        : base.playerQuizResultsSubQuizId),
    playerQuizResultsTileVisible:
      playerQuizResultsSubQuizIds.length > 0 ||
      (typeof value?.playerQuizResultsTileVisible === "boolean"
        ? value.playerQuizResultsTileVisible
        : base.playerQuizResultsTileVisible),
    playerTilesOrder: dedupedTilesOrder,
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
    projectorJoinQrOverlayVisible:
      typeof value?.projectorJoinQrOverlayVisible === "boolean"
        ? value.projectorJoinQrOverlayVisible
        : typeof value?.projectorJoinQrVisible === "boolean"
          ? value.projectorJoinQrVisible
          : base.projectorJoinQrOverlayVisible,
    projectorJoinQrText:
      typeof value?.projectorJoinQrText === "string"
        ? value.projectorJoinQrText.trim().slice(0, PROJECTOR_JOIN_QR_TEXT_MAX_LENGTH)
        : base.projectorJoinQrText,
    projectorJoinQrTextColor: sanitizeHex6(
      value?.projectorJoinQrTextColor,
      base.projectorJoinQrTextColor,
    ),
    projectorJoinQrOverlaySizePx: clampInt(
      value?.projectorJoinQrOverlaySizePx ?? base.projectorJoinQrOverlaySizePx,
      48,
      480,
    ),
    projectorJoinQrOverlayInsetVerticalPx: clampInt(
      value?.projectorJoinQrOverlayInsetVerticalPx ??
        value?.projectorJoinQrOverlayInsetPx ??
        base.projectorJoinQrOverlayInsetVerticalPx,
      0,
      200,
    ),
    projectorJoinQrOverlayInsetHorizontalPx: clampInt(
      value?.projectorJoinQrOverlayInsetHorizontalPx ??
        value?.projectorJoinQrOverlayInsetPx ??
        base.projectorJoinQrOverlayInsetHorizontalPx,
      0,
      200,
    ),
    projectorJoinQrOverlayInsetPx: clampInt(
      value?.projectorJoinQrOverlayInsetPx ?? base.projectorJoinQrOverlayInsetPx,
      0,
      200,
    ),
    projectorJoinQrOverlayCorner: sanitizeProjectorJoinQrOverlayCorner(
      value?.projectorJoinQrOverlayCorner,
      base.projectorJoinQrOverlayCorner,
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
    randomizerNamesText: (() => {
      const listMode =
        value?.randomizerListMode === "participants_only"
          ? "participants_only"
          : base.randomizerListMode;
      if (listMode === "participants_only") return "";
      if (typeof value?.randomizerNamesText === "string") {
        return value.randomizerNamesText.slice(0, 150_000);
      }
      return base.randomizerNamesText;
    })(),
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
    randomizerAnimationPool: Array.isArray(value?.randomizerAnimationPool)
      ? value.randomizerAnimationPool
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .slice(0, 10000)
      : [...base.randomizerAnimationPool],
    randomizerHistory: sanitizeRandomizerHistory(value?.randomizerHistory),
    randomizerRunId: clampInt(value?.randomizerRunId ?? base.randomizerRunId, 0, 1000000000),
    photoWallBaseUrl: sanitizePhotoWallBaseUrl(value?.photoWallBaseUrl),
    photoWallImageCount: clampPhotoWallImageCount(value?.photoWallImageCount),
    photoWallImageExt: sanitizePhotoWallImageExt(value?.photoWallImageExt),
    photoWallGridColumns: clampPhotoWallGridColumns(value?.photoWallGridColumns),
    photoWallAnimate:
      typeof value?.photoWallAnimate === "boolean" ? value.photoWallAnimate : base.photoWallAnimate,
    photoWallKenBurns:
      typeof value?.photoWallKenBurns === "boolean"
        ? value.photoWallKenBurns
        : base.photoWallKenBurns,
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
    reportFeedbackFormIds: Array.isArray(value?.reportFeedbackFormIds)
      ? value.reportFeedbackFormIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
          .slice(0, 200)
      : [...base.reportFeedbackFormIds],
    reportPublished:
      typeof value?.reportPublished === "boolean" ? value.reportPublished : base.reportPublished,
    brandPrimaryColor: sanitizeHex6(value?.brandPrimaryColor, base.brandPrimaryColor),
    brandAccentColor: sanitizeHex6(value?.brandAccentColor, base.brandAccentColor),
    brandSurfaceColor: sanitizeHex6(value?.brandSurfaceColor, base.brandSurfaceColor),
    brandTextColor: sanitizeHex6(value?.brandTextColor, base.brandTextColor),
    brandInputTextColor: sanitizeHex6(value?.brandInputTextColor, base.brandInputTextColor),
    brandFontFamily: sanitizeBrandFontFamily(value?.brandFontFamily, base.brandFontFamily),
    brandFontUrl: (() => {
      const family = sanitizeBrandFontFamily(value?.brandFontFamily, base.brandFontFamily);
      const url = sanitizeBrandUrl(value?.brandFontUrl ?? base.brandFontUrl);
      if (isBuiltinBrandFontFamily(family) && isMediaBrandFontUrl(url)) return "";
      return url;
    })(),
    brandFontUrls: (() => {
      const family = sanitizeBrandFontFamily(value?.brandFontFamily, base.brandFontFamily);
      if (isBuiltinBrandFontFamily(family)) return [];
      const fromPatch = filterMediaBrandFontUrls(
        sanitizeBrandFontUrls(value?.brandFontUrls, base.brandFontUrls ?? []),
      );
      if (fromPatch.length > 0) return fromPatch;
      const primary = sanitizeBrandUrl(value?.brandFontUrl ?? base.brandFontUrl);
      return isMediaBrandFontUrl(primary) ? [primary] : [];
    })(),
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
    brandTheme: sanitizeBrandThemeId(value?.brandTheme ?? base.brandTheme),
    appliedEventThemeName:
      typeof value?.appliedEventThemeName === "string"
        ? value.appliedEventThemeName.trim().slice(0, 120)
        : undefined,
    appliedEventThemeKey: sanitizeAppliedEventThemeKey(
      value?.appliedEventThemeKey ?? base.appliedEventThemeKey,
    ),
  };
}

export type ProjectorLeaderboardRow = {
  participantId: string;
  nickname: string;
  score: number;
  totalResponseMs: number;
};

export type ProjectorLeaderboardBySubQuiz = {
  subQuizId: string;
  title?: string;
  rows: ProjectorLeaderboardRow[];
};

/** Строки лидерборда для проектора: по выбранному сабквизу; без id — первый в списке. */
export function resolveProjectorLeaderboardRows(
  leaderboardsBySubQuiz: ProjectorLeaderboardBySubQuiz[],
  preferredSubQuizId: string | undefined,
  legacyLeaderboard: ProjectorLeaderboardRow[] = [],
): ProjectorLeaderboardRow[] {
  const boards = leaderboardsBySubQuiz ?? [];
  const pref = preferredSubQuizId?.trim();
  if (pref) {
    if (boards.length === 0) return [];
    const hit = boards.find((b) => b.subQuizId === pref);
    return hit?.rows ?? [];
  }
  if (boards.length > 0) return boards[0]?.rows ?? [];
  return legacyLeaderboard;
}

export {
  DEFAULT_VOTE_OPTION_BORDER_COLOR,
  isValidVoteOptionBorderColor,
  sanitizeVoteOptionBorderColor,
  voteOptionBorderColorToPickerHex,
} from "./voteOptionBorderColor.js";

export {
  buildVoteFillGradient,
  buildVoteQuestionTextGradient,
  isValidVoteFillColor,
  isValidVoteQuestionTextColor,
  isVoteFillGradient,
  isVoteQuestionTextGradient,
  parseVoteFillGradient,
  parseVoteQuestionTextGradient,
  sanitizeVoteFillColor,
  sanitizeVoteQuestionTextColor,
  voteFillOutlineColor,
  voteProgressBarFillStyle,
  voteProgressTrackBackground,
  voteQuestionTextTypographyStyle,
  VOTE_FILL_GRADIENT_RE,
  VOTE_MIN_BAR_DISPLAY_PERCENT,
  VOTE_PROGRESS_TRACK_OPACITY,
  VOTE_QUESTION_TEXT_GRADIENT_RE,
} from "./voteQuestionTextStyle.js";

export {
  inferQuestionUseImages,
  optionHasImage,
  optionHasTextOrImage,
  optionImageUrl,
  questionHasOptionImages,
} from "./voteOptionContent.js";

export type { BrandThemeId, BrandThemeVisualState } from "./brandThemes.js";
export {
  DEFAULT_BRAND_THEME_ID,
  getBrandThemeVisualPatch,
  getBrandThemeVisualPreset,
  getDefaultBrandThemeVisual,
  getMeyouBrandThemeVisual,
  sanitizeBrandThemeId,
} from "./brandThemes.js";

export type { EventThemeBranding, EventThemeBrandingPatch } from "./eventThemeBranding.js";
export {
  eventThemeBrandingToPublicViewPatch,
  sanitizeAppliedEventThemeKey,
  pickEventThemeBrandingFromPublicView,
} from "./eventThemeBranding.js";

export function normalizeEventThemeBranding(raw: unknown): EventThemeBranding {
  const partial =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Partial<PublicViewState>)
      : undefined;
  return pickEventThemeBrandingFromPublicView(normalizePublicViewState(partial));
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
    return withProjectorTagCloudFields(merged);
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
  return withProjectorTagCloudFields(merged);
}

export {
  BUILTIN_BRAND_FONT_FAMILIES,
  filterMediaBrandFontUrls,
  inferCssFontFormat,
  inferFontFaceDescriptor,
  isBuiltinBrandFontFamily,
  isMediaBrandFontUrl,
  sanitizeBrandFontUrls,
  type BrandFontFaceDescriptor,
} from "./brandFontFaces.js";

export {
  SYSTEM_EVENT_THEME_IDS,
  brandThemeIdFromSystemEventThemeId,
  isSystemEventThemeId,
  systemEventThemeDisplayName,
  systemEventThemeStorageName,
  type SystemEventThemeId,
} from "./systemEventThemes.js";

export {
  prunePlayerUiRefsForRoom,
  prunePublicViewForRoomContent,
  playerUiRefsChanged,
  publicViewRoomPruneChanged,
  type PlayerUiRefsSlice,
  type PublicViewRoomPruneSlice,
} from "./prunePlayerUiRefs.js";
export {
  isBrandingEmitGuardPublicViewStateKey,
  isPlayerOnlyPublicViewPatch,
  isPlayerOnlyPublicViewStateKey,
  pickProjectorPublicViewState,
  projectorPublicViewChanged,
  projectorPublicViewFingerprint,
} from "./projectorPublicView.js";
export {
  computeTemperatureWeightedAverage,
  clampTemperatureScaleValue,
  roundTemperatureScaleValue,
  formatTemperatureScaleValue,
  formatTemperatureScaleLabel,
  DEFAULT_TEMPERATURE_OPTION_WEIGHTS,
  TEMPERATURE_SCALE_MIN,
  TEMPERATURE_SCALE_MAX,
} from "./temperatureVote.js";
export {
  formatVoteDistributionPercent,
  voteDistributionPercentWidth,
} from "./voteDistributionPercent.js";
export {
  SPEAKER_ALL_TARGET,
  SPEAKER_NOT_SELECTED,
  isKnownSpeakerTargetValue,
  isSpeakerRecipientHiddenFromAudience,
  shouldShowSpeakerRecipientToAudience,
} from "./speakerQuestionTargets.js";
