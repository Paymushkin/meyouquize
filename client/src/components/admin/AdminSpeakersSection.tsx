import { Card, CardContent, Stack } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";
import type {
  AdminSpeakerQuestionsPanelActions,
  AdminSpeakerQuestionsSettingsValues,
} from "../../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";
import { SpeakerQuestionsTable } from "./SpeakerQuestionsTable";
import { AdminSpeakerSettingsPanel } from "./AdminSpeakerSettingsPanel";
import { useSpeakerQuestionsSplit } from "../../features/speakerQuestionsAdmin/useSpeakerQuestionsSplit";

type Props = {
  settings: AdminSpeakerQuestionsSettingsValues;
  panelActions: AdminSpeakerQuestionsPanelActions;
  questions: SpeakerQuestionItem[];
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onSetUserVisible: (id: string, next: boolean) => void;
  onSetOnScreen: (id: string, next: boolean) => void;
  onUpdateQuestionText: (id: string, text: string) => void;
  onDeleteQuestion: (id: string) => void;
};

export function AdminSpeakersSection(props: Props) {
  const {
    settings,
    panelActions,
    questions,
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
      <AdminSpeakerSettingsPanel settings={settings} actions={panelActions} />
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
