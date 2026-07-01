import { AdminResultsSection } from "../../components/admin/AdminResultsSection";
import type { LeaderboardItem, LeaderboardSort } from "../../admin/adminEventTypes";

export type AdminEventResultsTabProps = {
  leaderboardSort: LeaderboardSort;
  setLeaderboardSort: (value: LeaderboardSort) => void;
  displayedLeaderboard: LeaderboardItem[];
  exportLeaderboardCsv: () => void;
  leaderboardsBySubQuiz: Array<{ subQuizId: string; title: string }>;
  resultsSubQuizId: string;
  onSelectResultsSubQuiz: (subQuizId: string) => void;
};

export function AdminEventResultsTab({
  leaderboardSort,
  setLeaderboardSort,
  displayedLeaderboard,
  exportLeaderboardCsv,
  leaderboardsBySubQuiz,
  resultsSubQuizId,
  onSelectResultsSubQuiz,
}: AdminEventResultsTabProps) {
  return (
    <AdminResultsSection
      leaderboardSort={leaderboardSort}
      setLeaderboardSort={setLeaderboardSort}
      displayedLeaderboard={displayedLeaderboard}
      exportLeaderboardCsv={exportLeaderboardCsv}
      subQuizLeaderboardOptions={leaderboardsBySubQuiz}
      selectedResultsSubQuizId={resultsSubQuizId}
      onSelectResultsSubQuiz={onSelectResultsSubQuiz}
    />
  );
}
