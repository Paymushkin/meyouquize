import {
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type {
  AdminSpeakerQuestionsPanelActions,
  AdminSpeakerQuestionsSettingsValues,
} from "../../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";

type Props = {
  settings: AdminSpeakerQuestionsSettingsValues;
  actions: AdminSpeakerQuestionsPanelActions;
};

export function AdminSpeakerSettingsPanel({ settings, actions }: Props) {
  const {
    enabled,
    reactionsText,
    showAuthorOnScreen,
    showRecipientOnScreen,
    showReactionsOnScreen,
    speakersText,
  } = settings;
  const {
    onToggleEnabled,
    onReactionsTextChange,
    onToggleShowAuthorOnScreen,
    onToggleShowRecipientOnScreen,
    onToggleShowReactionsOnScreen,
    onSpeakersTextChange,
    onSaveSettings,
  } = actions;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6">Вопросы спикерам</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={<Switch checked={enabled} onChange={(_, v) => onToggleEnabled(v)} />}
              label="Кнопка у пользователей"
            />
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={
                <Switch
                  checked={showAuthorOnScreen}
                  onChange={(_, v) => onToggleShowAuthorOnScreen(v)}
                />
              }
              label="Автор на экране"
            />
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={
                <Switch
                  checked={showRecipientOnScreen}
                  onChange={(_, v) => onToggleShowRecipientOnScreen(v)}
                />
              }
              label="«Кому» на экране"
            />
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={
                <Switch
                  checked={showReactionsOnScreen}
                  onChange={(_, v) => onToggleShowReactionsOnScreen(v)}
                />
              }
              label="Реакции на экране"
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ width: "100%" }}>
            <TextField
              sx={{ flex: 1, minWidth: 0 }}
              label="Реакции (по одной в строке, например 👍)"
              size="small"
              multiline
              minRows={2}
              value={reactionsText}
              onChange={(e) => onReactionsTextChange(e.target.value)}
            />
            <TextField
              sx={{ flex: 1, minWidth: 0 }}
              label="Список спикеров (по одному в строке)"
              size="small"
              multiline
              minRows={3}
              value={speakersText}
              onChange={(e) => onSpeakersTextChange(e.target.value)}
            />
          </Stack>
          <Button variant="contained" onClick={onSaveSettings}>
            Сохранить настройки
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
