export type ActiveQuestion = {
  id: string;
  text: string;
  type: "single" | "multi" | "tag_cloud" | "ranking";
  scoringMode?: "poll" | "quiz";
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

export type PlayerSubQuizReportQuestionRow = {
  questionId: string;
  order: number;
  text: string;
  type: "single" | "multi" | "tag_cloud" | "ranking";
  scoringMode: "poll" | "quiz";
  points: number;
  scoreAwarded: number | null;
  userAnswerText: string;
  correctAnswerText: string;
};

export type PlayerSubQuizReportPayload = {
  subQuizId: string;
  title: string;
  totalScore: number;
  questions: PlayerSubQuizReportQuestionRow[];
  leaderboardPlace: number | null;
  leaderboardTotal: number;
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
  speakerTileTextColor?: string;
  speakerTileVisible?: boolean;
  programTileText?: string;
  programTileBackgroundColor?: string;
  programTileTextColor?: string;
  programTileLinkUrl?: string;
  programTileVisible?: boolean;
  playerQuizResultsTileVisible?: boolean;
  playerQuizResultsTileText?: string;
  playerQuizResultsTileBackgroundColor?: string;
  playerQuizResultsTileTextColor?: string;
  playerQuizResultsSubQuizId?: string;
  playerQuizResultsSubQuizIds?: string[];
  /** Сабквизы с названиями — для подписи плитки «Мой квиз» у игрока */
  playerSubQuizzes?: Array<{ id: string; title: string }>;
  playerVoteOptionTextColor?: string;
  playerVoteProgressTrackColor?: string;
  playerVoteProgressBarColor?: string;
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
  /** Сумма начисленных баллов по квизу (только в payload для игрока по сокету). */
  myTotalScore?: number;
  /** Суммы баллов по сабквизам (для плитки «Мой квиз»). */
  mySubQuizScores?: Record<string, number>;
  quizProgress: {
    subQuizId: string;
    questionFlowMode?: "manual" | "auto";
    index: number;
    total: number;
    orderedQuestionIds?: string[];
  } | null;
  activeQuestions?: ActiveQuestion[];
  activeQuestion: ActiveQuestion | null;
};
