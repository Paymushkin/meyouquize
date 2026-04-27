export type QuestionResult = {
  questionId: string;
  text: string;
  subQuizId?: string | null;
  /** Для проектора: показывать блок «первые верно ответившие» (если включено глобально в комнате). */
  projectorShowFirstCorrect?: boolean;
  projectorFirstCorrectWinnersCount?: number;
  type?: "single" | "multi" | "tag_cloud" | "ranking";
  rankingProjectorMetric?: "avg_rank" | "avg_score" | "total_score";
  rankingKind?: "quiz" | "jury";
  optionStats: Array<{
    optionId: string;
    text: string;
    count: number;
    isCorrect: boolean;
    avgRank?: number;
    avgScore?: number;
    totalScore?: number;
  }>;
  tagCloud?: Array<{
    text: string;
    count: number;
  }>;
  /** Первые верно ответившие по времени (голосования комнаты), до 20 шт. */
  firstCorrectNicknames?: string[];
};

export type LeaderboardItem = {
  participantId: string;
  nickname: string;
  score: number;
};

export type SubQuizLeaderboardPayload = {
  subQuizId: string;
  title: string;
  rows: LeaderboardItem[];
};

export type LeaderboardSort =
  | "place_asc"
  | "place_desc"
  | "score_desc"
  | "score_asc"
  | "name_asc"
  | "name_desc";

/** Место в зачёте по убыванию баллов (типа баллы → ник). Для TOP/«Место» при любой сортировке таблицы. */
export function leaderboardPlaceByScore(items: LeaderboardItem[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.nickname.localeCompare(b.nickname, "ru");
  });
  const map = new Map<string, number>();
  sorted.forEach((item, i) => {
    map.set(item.participantId, i + 1);
  });
  return map;
}
