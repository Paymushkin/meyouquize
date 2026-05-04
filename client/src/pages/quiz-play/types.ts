export type ActiveQuestion = {
  id: string;
  text: string;
  type: "single" | "multi" | "tag_cloud" | "ranking";
  /** Для ranking: квиз с эталоном или жюри (без зачёта в лидерборде) */
  rankingKind?: "quiz" | "jury";
  /** Баллы за 1-е, 2-е, … место в ответе (длина = числу вариантов) */
  rankingPointsByRank?: number[];
  /** Кастомная подсказка игроку для ранжирования (если не задана — дефолтный текст). */
  rankingPlayerHint?: string;
  maxAnswers?: number;
  options: Array<{ id: string; text: string }>;
  isClosed: boolean;
};

export type ReactionType = string;

export type ReactionSessionHistoryItem = {
  id: string;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
};

export type ReactionSession = {
  id: string;
  quizId: string;
  isActive: boolean;
  startedAt: string;
  endsAt: string;
  reactions: string[];
  counts: Record<string, number>;
  uniqueReactorsByReaction: Record<string, number>;
  totalReactions: number;
  uniqueReactors: number;
  history: ReactionSessionHistoryItem[];
};

export type PlayerVisibleResultOptionStat = {
  optionId: string;
  text: string;
  count: number;
  isCorrect: boolean;
  avgRank?: number;
  avgScore?: number;
  totalScore?: number;
};

export type PlayerVisibleResultTile = {
  questionId: string;
  text: string;
  type: "single" | "multi" | "ranking";
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  optionStats: PlayerVisibleResultOptionStat[];
};

export type QuizState = {
  id: string;
  title: string;
  showEventTitleOnPlayer?: boolean;
  playerBanners?: Array<{
    id: string;
    linkUrl: string;
    backgroundUrl: string;
    size: "2x1" | "1x1" | "full";
    isVisible: boolean;
  }>;
  activePlayerBannerId?: string;
  speakerTileText?: string;
  speakerTileBackgroundColor?: string;
  speakerTileVisible?: boolean;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
  playerVisibleResults?: PlayerVisibleResultTile[];
  playerTilesOrder?: string[];
  brandPrimaryColor?: string;
  brandAccentColor?: string;
  brandSurfaceColor?: string;
  brandTextColor?: string;
  brandFontFamily?: string;
  brandFontUrl?: string;
  brandLogoUrl?: string;
  brandPlayerBackgroundImageUrl?: string;
  brandProjectorBackgroundImageUrl?: string;
  brandBodyBackgroundColor?: string;
  reactionSession?: ReactionSession | null;
  status: string;
  quizProgress: {
    subQuizId: string;
    questionFlowMode?: "manual" | "auto";
    index: number;
    total: number;
  } | null;
  activeQuestions?: ActiveQuestion[];
  activeQuestion: ActiveQuestion | null;
};
