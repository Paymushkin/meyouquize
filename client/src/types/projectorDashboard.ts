/** Типы данных сокета `results:dashboard` / экрана проектора */

export type ProjectorOptionStat = {
  optionId: string;
  text: string;
  imageUrl?: string;
  count: number;
  isCorrect: boolean;
  /** Средний ранг (1..N), только для type === "ranking" */
  avgRank?: number;
  /** Средний вклад в баллы за верную позицию (при настроенных весах) */
  avgScore?: number;
  /** Сумма баллов по ответам за верные позиции варианта */
  totalScore?: number;
  /** Для temperature: вес варианта 0–100 */
  weight?: number;
  /** Hex-цвет сегмента (дебаты / side-by-side) */
  color?: string;
  /** Geo poll: координаты для карты */
  lat?: number;
  lon?: number;
};

export type ProjectorTagCloudWord = { text: string; count: number };

export type ProjectorLayoutWord = {
  text: string;
  count: number;
  size: number;
  x: number;
  y: number;
  rotate: number;
};

export type ProjectorQuestionResult = {
  questionId: string;
  text: string;
  imageUrl?: string;
  subQuizId?: string | null;
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  type?: "single" | "multi" | "tag_cloud" | "ranking" | "temperature";
  /** Для ranking: что показывать по вариантам */
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  /** Для ranking: жюри — без блока «первые верные» */
  rankingKind?: "quiz" | "jury";
  /** Для temperature: средневзвешенное значение шкалы 0–100 */
  temperatureValue?: number | null;
  /** Для temperature: подзаголовок над шкалой на проекторе */
  temperatureSubtitle?: string;
  /** Для дебатов: id baseline-опроса «до». */
  debateBaselineQuestionId?: string;
  /** Side-by-side layout на проекторе (2–3 варианта). */
  projectorDebateLayout?: boolean;
  /** Серия многораундовых дебатов. */
  debateSeriesId?: string;
  /** Индекс раунда в серии (0-based). */
  debateRoundIndex?: number;
  /** Заголовок накопительного итога серии. */
  debateSeriesResultTitle?: string;
  /** Geo poll: id словаря автодополнения. */
  geoPollDictionary?: string;
  optionStats: ProjectorOptionStat[];
  tagCloud?: ProjectorTagCloudWord[];
  /** Все синонимы эталонов (квиз); для подсветки облака на проекторе */
  tagCloudReferenceAliases?: string[];
  firstCorrectNicknames?: string[];
};

export type ProjectorLeader = {
  participantId: string;
  nickname: string;
  score: number;
  /** Время ответов (тай-брейк): сумма responseMs по всем вопросам в сабквизе. */
  totalResponseMs: number;
};

export type ProjectorLeaderboardBySubQuiz = {
  subQuizId: string;
  title: string;
  rows: ProjectorLeader[];
};
