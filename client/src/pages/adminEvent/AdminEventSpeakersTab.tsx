import { AdminSpeakersSection } from "../../components/admin/AdminSpeakersSection";
import type {
  AdminSpeakerQuestionsPanelActions,
  AdminSpeakerQuestionsSettingsValues,
} from "../../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import type { useAdminSpeakerQuestions } from "../../features/admin/useAdminSpeakerQuestions";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

export type AdminEventSpeakersTabProps = {
  speakerQuestions: ReturnType<typeof useAdminSpeakerQuestions>;
  panelActions: AdminSpeakerQuestionsPanelActions;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onSetUserVisible: (id: string, next: boolean) => void;
  onSetOnScreen: (id: string, next: boolean) => void;
  onUpdateQuestionText: (id: string, text: string) => void;
  onDeleteQuestion: (id: string) => void;
};

export function AdminEventSpeakersTab({
  speakerQuestions,
  panelActions,
  onHide,
  onRestore,
  onSetUserVisible,
  onSetOnScreen,
  onUpdateQuestionText,
  onDeleteQuestion,
}: AdminEventSpeakersTabProps) {
  const settings: AdminSpeakerQuestionsSettingsValues = speakerQuestions.settings;
  const questions: SpeakerQuestionItem[] = speakerQuestions.payload?.items ?? [];

  return (
    <AdminSpeakersSection
      settings={settings}
      panelActions={panelActions}
      questions={questions}
      onHide={onHide}
      onRestore={onRestore}
      onSetUserVisible={onSetUserVisible}
      onSetOnScreen={onSetOnScreen}
      onUpdateQuestionText={onUpdateQuestionText}
      onDeleteQuestion={onDeleteQuestion}
    />
  );
}
