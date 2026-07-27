import type {
  ProjectorLeader,
  ProjectorLeaderboardBySubQuiz,
  ProjectorQuestionResult,
} from "../../types/projectorDashboard";

/** Сравнение данных дашборда — голоса, метрики ранжирования и настройки проектора. */
export function projectorDashboardFingerprint(
  questions: ProjectorQuestionResult[],
  leaders: ProjectorLeader[],
  leaderboardsBySubQuiz: ProjectorLeaderboardBySubQuiz[],
): string {
  return JSON.stringify({
    q: questions.map((question) => ({
      id: question.questionId,
      type: question.type,
      rankingProjectorMetric: question.rankingProjectorMetric,
      rankingKind: question.rankingKind,
      projectorShowFirstCorrect: question.projectorShowFirstCorrect,
      projectorFirstCorrectWinnersCount: question.projectorFirstCorrectWinnersCount,
      tagCloud: question.tagCloud,
      optionStats: question.optionStats.map((row) => ({
        text: row.text,
        count: row.count,
        weight: row.weight,
        isCorrect: row.isCorrect,
        avgRank: row.avgRank,
        avgScore: row.avgScore,
        totalScore: row.totalScore,
      })),
      firstCorrectNicknames: question.firstCorrectNicknames,
      temperatureValue: question.temperatureValue,
    })),
    l: leaders.map(
      (row) => `${row.participantId}:${row.score}:${row.totalResponseMs}:${row.nickname}`,
    ),
    sq: leaderboardsBySubQuiz.map((board) => ({
      id: board.subQuizId,
      title: board.title,
      rows: board.rows.map(
        (row) => `${row.participantId}:${row.score}:${row.totalResponseMs}:${row.nickname}`,
      ),
    })),
  });
}
