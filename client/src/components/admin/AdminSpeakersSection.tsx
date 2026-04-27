import { Card, CardContent, Stack } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import { SpeakerQuestionsTable } from "./SpeakerQuestionsTable";
import { AdminSpeakerSettingsPanel } from "./AdminSpeakerSettingsPanel";
import { useSpeakerQuestionsSplit } from "../../features/speakerQuestionsAdmin/useSpeakerQuestionsSplit";

type Props = {
  enabled: boolean;
  allowLikes: boolean;
  showLikesOnScreen: boolean;
  reactionsText: string;
  showAuthorOnScreen: boolean;
  speakersText: string;
  questions: SpeakerQuestionItem[];
  onToggleEnabled: (next: boolean) => void;
  onToggleAllowLikes: (next: boolean) => void;
  onToggleShowLikesOnScreen: (next: boolean) => void;
  onReactionsTextChange: (next: string) => void;
  onToggleShowAuthorOnScreen: (next: boolean) => void;
  onSpeakersTextChange: (next: string) => void;
  onSaveSettings: () => void;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onSetUserVisible: (id: string, next: boolean) => void;
  onSetOnScreen: (id: string, next: boolean) => void;
  onUpdateQuestionText: (id: string, text: string) => void;
  onDeleteQuestion: (id: string) => void;
};

export function AdminSpeakersSection(props: Props) {
  const {
    enabled,
    allowLikes,
    showLikesOnScreen,
    reactionsText,
    showAuthorOnScreen,
    speakersText,
    questions,
    onToggleEnabled,
    onToggleAllowLikes,
    onToggleShowLikesOnScreen,
    onReactionsTextChange,
    onToggleShowAuthorOnScreen,
    onSpeakersTextChange,
    onSaveSettings,
    onHide,
    onRestore,
    onSetUserVisible,
    onSetOnScreen,
    onUpdateQuestionText,
    onDeleteQuestion,
  } = props;
  const { hidden, fresh } = useSpeakerQuestionsSplit(questions);
  return (
    <Stack spacing={2}>
      <AdminSpeakerSettingsPanel
        enabled={enabled}
        allowLikes={allowLikes}
        showLikesOnScreen={showLikesOnScreen}
        reactionsText={reactionsText}
        showAuthorOnScreen={showAuthorOnScreen}
        speakersText={speakersText}
        onToggleEnabled={onToggleEnabled}
        onToggleAllowLikes={onToggleAllowLikes}
        onToggleShowLikesOnScreen={onToggleShowLikesOnScreen}
        onReactionsTextChange={onReactionsTextChange}
        onToggleShowAuthorOnScreen={onToggleShowAuthorOnScreen}
        onSpeakersTextChange={onSpeakersTextChange}
        onSaveSettings={onSaveSettings}
      />
      <Card variant="outlined">
        <CardContent>
          <SpeakerQuestionsTable
            rows={fresh}
            title="Новые вопросы"
            actionHeader="Скрыть"
            actionAriaLabel="Скрыть вопрос"
            actionIcon={<VisibilityOffOutlinedIcon fontSize="small" />}
            showScreenColumn
            onSetUserVisible={onSetUserVisible}
            onSetOnScreen={onSetOnScreen}
            onUpdateQuestionText={onUpdateQuestionText}
            onAction={onHide}
            onDelete={onDeleteQuestion}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <SpeakerQuestionsTable
            rows={hidden}
            title="Скрытые вопросы"
            actionHeader="Вернуть"
            actionAriaLabel="Вернуть вопрос"
            actionIcon={<UndoOutlinedIcon fontSize="small" />}
            showScreenColumn={false}
            onSetUserVisible={onSetUserVisible}
            onUpdateQuestionText={onUpdateQuestionText}
            onAction={onRestore}
            onDelete={onDeleteQuestion}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
