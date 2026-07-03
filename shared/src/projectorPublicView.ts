import type { PublicViewState } from "./index.js";
import { withProjectorTagCloudFields } from "./tagCloudManual.js";

/** Поля publicView, которые влияют только на интерфейс игрока / отчёт, но не на проектор. */
const PLAYER_ONLY_PUBLIC_VIEW_KEYS = [
  "showEventTitleOnPlayer",
  "playerAutoJoinRandomNickname",
  "playerBanners",
  "playerBannerClickStats",
  "playerBannerClickParticipantIds",
  "activePlayerBannerId",
  "speakerTileText",
  "speakerTileBackgroundColor",
  "speakerTileTextColor",
  "speakerTileVisible",
  "programTileText",
  "programTileBackgroundColor",
  "programTileTextColor",
  "programTileLinkUrl",
  "programTileVisible",
  "playerQuizResultsTileVisible",
  "playerQuizResultsTileText",
  "playerQuizResultsTileBackgroundColor",
  "playerQuizResultsTileTextColor",
  "playerQuizResultsSubQuizId",
  "playerQuizResultsSubQuizIds",
  "playerTilesOrder",
  "playerVisibleResultQuestionIds",
  "playerVoteOptionTextColor",
  "playerVoteProgressTrackColor",
  "playerVoteProgressBarColor",
  "reportTitle",
  "reportModules",
  "reportVoteQuestionIds",
  "reportQuizQuestionIds",
  "reportQuizSubQuizIds",
  "reportSubQuizHideParticipantTableIds",
  "reportRandomizerRunIds",
  "reportReactionsWidgetIds",
  "reportSpeakerQuestionIds",
  "reportFeedbackFormIds",
  "reportPublished",
  "brandPlayerBackgroundImageUrl",
  "brandBodyBackgroundColor",
  "brandLogoUrl",
  /** Включает плитку у игроков; на экран вопроса/облака на проекторе не влияет. */
  "speakerQuestionsEnabled",
  /** Конфиг виджетов реакций — только админка; на проекторе влияет только overlay в mode=reactions. */
  "reactionsWidgets",
  "reactionsWidgetStats",
  /** Списки спикеров/реакций — только игрок; на проекторе mode=speaker_questions контент из отдельного канала. */
  "speakerQuestionsSpeakers",
  "speakerQuestionsReactions",
  "speakerQuestionsAllowAllSpeakersTarget",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const PLAYER_ONLY_KEY_SET = new Set<string>(PLAYER_ONLY_PUBLIC_VIEW_KEYS);

const PROJECTOR_BRANDING_KEYS = [
  "projectorBackground",
  "brandPrimaryColor",
  "brandAccentColor",
  "brandTextColor",
  "brandFontFamily",
  "brandFontUrl",
  "brandFontUrls",
  "brandProjectorBackgroundImageUrl",
  "brandTheme",
  "projectorJoinQrVisible",
  "projectorJoinQrText",
  "projectorJoinQrTextColor",
  "projectorJoinQrOverlaySizePx",
  "projectorJoinQrOverlayInsetPx",
  "projectorJoinQrOverlayCorner",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const QUESTION_MODE_KEYS = [
  "questionId",
  "questionRevealStage",
  "showVoteCount",
  "showCorrectOption",
  "showQuestionTitle",
  "hiddenTagTexts",
  "injectedTagWords",
  "tagCountOverrides",
  "cloudQuestionColor",
  "cloudTagColors",
  "cloudTopTagColor",
  "cloudCorrectTagColor",
  "cloudDensity",
  "cloudTagPadding",
  "cloudSpiral",
  "cloudAnimationStrength",
  "voteQuestionTextColor",
  "voteOptionTextColor",
  "voteOptionBorderColor",
  "voteProgressTrackColor",
  "voteProgressBarColor",
  "showFirstCorrectAnswerer",
  "firstCorrectWinnersCount",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const LEADERBOARD_MODE_KEYS = [
  "highlightedLeadersCount",
  "leaderboardSubQuizId",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const SPEAKER_QUESTIONS_MODE_KEYS = [
  "speakerQuestionsShowAuthorOnScreen",
  "speakerQuestionsShowRecipientOnScreen",
  "speakerQuestionsShowReactionsOnScreen",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const REACTIONS_MODE_KEYS = ["reactionsOverlayText"] as const satisfies ReadonlyArray<
  keyof PublicViewState
>;

const RANDOMIZER_MODE_KEYS = [
  "randomizerMode",
  "randomizerListMode",
  "randomizerTitle",
  "randomizerNamesText",
  "randomizerMinNumber",
  "randomizerMaxNumber",
  "randomizerWinnersCount",
  "randomizerExcludeWinners",
  "randomizerSelectedWinners",
  "randomizerCurrentWinners",
  "randomizerAnimationPool",
  "randomizerHistory",
  "randomizerRunId",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

const REPORT_MODE_KEYS = [
  "reportTitle",
  "reportModules",
  "reportVoteQuestionIds",
  "reportQuizQuestionIds",
  "reportQuizSubQuizIds",
  "reportSubQuizHideParticipantTableIds",
  "reportRandomizerRunIds",
  "reportReactionsWidgetIds",
  "reportSpeakerQuestionIds",
  "reportFeedbackFormIds",
  "reportPublished",
] as const satisfies ReadonlyArray<keyof PublicViewState>;

function pickViewKeys(
  view: PublicViewState,
  keys: readonly (keyof PublicViewState)[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = view[key];
  }
  return out;
}

/** Срез publicView для сравнения «нужно ли слать results:public:view на проектор». */
export function pickProjectorPublicViewState(view: PublicViewState): PublicViewState {
  const resolved = withProjectorTagCloudFields(view);
  const branding = pickViewKeys(resolved, PROJECTOR_BRANDING_KEYS);
  const mode = resolved.mode;

  switch (mode) {
    case "title":
      return { mode, ...branding } as PublicViewState;
    case "question":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, QUESTION_MODE_KEYS),
        tagCloudManualByQuestionId: resolved.tagCloudManualByQuestionId,
      } as PublicViewState;
    case "leaderboard":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, LEADERBOARD_MODE_KEYS),
      } as PublicViewState;
    case "speaker_questions":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, SPEAKER_QUESTIONS_MODE_KEYS),
      } as PublicViewState;
    case "reactions":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, REACTIONS_MODE_KEYS),
      } as PublicViewState;
    case "randomizer":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, RANDOMIZER_MODE_KEYS),
      } as PublicViewState;
    case "report":
      return {
        mode,
        ...branding,
        ...pickViewKeys(resolved, REPORT_MODE_KEYS),
      } as PublicViewState;
    default:
      return { mode, ...branding } as unknown as PublicViewState;
  }
}

export function projectorPublicViewFingerprint(view: PublicViewState): string {
  return JSON.stringify(pickProjectorPublicViewState(view));
}

export function projectorPublicViewChanged(prev: PublicViewState, next: PublicViewState): boolean {
  return projectorPublicViewFingerprint(prev) !== projectorPublicViewFingerprint(next);
}

export function isPlayerOnlyPublicViewPatch(patch: Record<string, unknown>): boolean {
  const keys = Object.keys(patch).filter((key) => key !== "quizId");
  return keys.length > 0 && keys.every((key) => PLAYER_ONLY_KEY_SET.has(key));
}

export function isPlayerOnlyPublicViewStateKey(key: string): boolean {
  return PLAYER_ONLY_KEY_SET.has(key);
}
