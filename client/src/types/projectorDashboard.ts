/** Типы данных сокета `results:dashboard` / экрана проектора */

export type ProjectorOptionStat = {
  optionId: string;
  text: string;
  count: number;
  isCorrect: boolean;
  /** Средний ранг (1..N), только для type === "ranking" */
  avgRank?: number;
  /** Средний вклад в баллы за верную позицию (при настроенных весах) */
  avgScore?: number;
  /** Сумма баллов по ответам за верные позиции варианта */
  totalScore?: number;
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
  subQuizId?: string | null;
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  type?: "single" | "multi" | "tag_cloud" | "ranking";
  /** Для ranking: что показывать по вариантам */
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  /** Для ranking: жюри — без блока «первые верные» */
  rankingKind?: "quiz" | "jury";
  optionStats: ProjectorOptionStat[];
  tagCloud?: ProjectorTagCloudWord[];
  firstCorrectNicknames?: string[];
};

export type ProjectorLeader = { participantId: string; nickname: string; score: number };
