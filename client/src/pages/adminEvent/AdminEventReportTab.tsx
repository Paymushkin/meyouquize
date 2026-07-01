import { AdminReportSection } from "../../components/admin/AdminReportSection";
import { API_BASE, APP_ORIGIN } from "../../config";
import type { useAdminRandomizer } from "../../features/admin/useAdminRandomizer";
import type { useAdminReactions } from "../../features/admin/useAdminReactions";
import type { useAdminReport } from "../../features/admin/useAdminReport";
import type { useAdminSpeakerQuestions } from "../../features/admin/useAdminSpeakerQuestions";
import type { PublicViewSetPatch } from "../../publicViewContract";

type QuizQuestionGroup = {
  subQuizId: string;
  subQuizTitle: string;
  questions: Array<{ id: string; text: string }>;
};

type VoteQuestion = { id: string; text: string };

type Props = {
  roomSlug: string;
  adminReport: ReturnType<typeof useAdminReport>;
  randomizer: ReturnType<typeof useAdminRandomizer>;
  adminReactions: ReturnType<typeof useAdminReactions>;
  speakerQuestions: ReturnType<typeof useAdminSpeakerQuestions>;
  availableQuizQuestions: QuizQuestionGroup[];
  availableVoteQuestions: VoteQuestion[];
  emitPublicViewPatch: (patch: PublicViewSetPatch) => void;
  setMessage: (message: string) => void;
};

export function AdminEventReportTab({
  roomSlug,
  adminReport,
  randomizer,
  adminReactions,
  speakerQuestions,
  availableQuizQuestions,
  availableVoteQuestions,
  emitPublicViewPatch,
  setMessage,
}: Props) {
  return (
    <AdminReportSection
      reportTitle={adminReport.reportTitle}
      onReportTitleChange={adminReport.setReportTitle}
      onReportTitleCommit={() => emitPublicViewPatch({ reportTitle: adminReport.reportTitle })}
      reportModules={adminReport.reportModules}
      onToggleModule={adminReport.toggleReportModule}
      onMoveModule={adminReport.moveReportModule}
      availableQuizQuestions={availableQuizQuestions}
      selectedQuizIds={adminReport.reportQuizSubQuizIds}
      selectedQuizQuestionIds={adminReport.reportQuizQuestionIds}
      onToggleQuiz={adminReport.toggleReportQuiz}
      onToggleQuizQuestion={adminReport.toggleReportQuizQuestion}
      reportSubQuizHideParticipantTableIds={adminReport.reportSubQuizHideParticipantTableIds}
      onToggleSubQuizParticipantTable={adminReport.toggleReportSubQuizParticipantTable}
      randomizerHistory={randomizer.history}
      randomizerCurrentWinners={randomizer.currentWinners}
      reportRandomizerRunIds={adminReport.reportRandomizerRunIds}
      onToggleRandomizerRun={adminReport.toggleReportRandomizerRun}
      reactionWidgets={adminReactions.widgets}
      reportReactionsWidgetIds={adminReport.reportReactionsWidgetIds}
      onToggleReactionsWidget={adminReport.toggleReportReactionsWidget}
      speakerQuestionsForReport={speakerQuestions.payload?.items ?? []}
      reportSpeakerQuestionIds={speakerQuestions.reportSpeakerQuestionIds}
      onToggleSpeakerQuestion={speakerQuestions.toggleReportSpeakerQuestion}
      availableVoteQuestions={availableVoteQuestions}
      selectedVoteQuestionIds={adminReport.reportVoteQuestionIds}
      onToggleVoteQuestion={adminReport.toggleReportVoteQuestion}
      availableFeedbackForms={adminReport.availableFeedbackForms}
      reportFeedbackFormIds={adminReport.reportFeedbackFormIds}
      onToggleFeedbackForm={adminReport.toggleReportFeedbackForm}
      reportPublished={adminReport.reportPublished}
      onTogglePublished={(next) => adminReport.toggleReportPublished(next, setMessage)}
      publicReportUrl={`${APP_ORIGIN}/report/${roomSlug}`}
      pdfReportUrl={`${API_BASE}/api/quiz/by-slug/${encodeURIComponent(roomSlug)}/public-report.pdf`}
    />
  );
}
