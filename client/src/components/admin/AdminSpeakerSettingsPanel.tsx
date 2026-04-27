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

type Props = {
  enabled: boolean;
  allowLikes: boolean;
  showLikesOnScreen: boolean;
  reactionsText: string;
  showAuthorOnScreen: boolean;
  speakersText: string;
  onToggleEnabled: (next: boolean) => void;
  onToggleAllowLikes: (next: boolean) => void;
  onToggleShowLikesOnScreen: (next: boolean) => void;
  onReactionsTextChange: (next: string) => void;
  onToggleShowAuthorOnScreen: (next: boolean) => void;
  onSpeakersTextChange: (next: string) => void;
  onSaveSettings: () => void;
};

export function AdminSpeakerSettingsPanel({
  enabled,
  allowLikes,
  showLikesOnScreen,
  reactionsText,
  showAuthorOnScreen,
  speakersText,
  onToggleEnabled,
  onToggleAllowLikes,
  onToggleShowLikesOnScreen,
  onReactionsTextChange,
  onToggleShowAuthorOnScreen,
  onSpeakersTextChange,
  onSaveSettings,
}: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Typography variant="h6">Вопросы спикерам</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={<Switch checked={enabled} onChange={(_, v) => onToggleEnabled(v)} />}
              label="Кнопка у пользователей"
            />
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={<Switch checked={allowLikes} onChange={(_, v) => onToggleAllowLikes(v)} />}
              label="Оценки"
            />
            <FormControlLabel
              sx={{ m: 0, minHeight: 36 }}
              control={
                <Switch
                  checked={showLikesOnScreen}
                  onChange={(_, v) => onToggleShowLikesOnScreen(v)}
                />
              }
              label="Лайки на экране"
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
          </Stack>
          <TextField
            label="Реакции (по одной в строке, например 👍)"
            size="small"
            multiline
            minRows={2}
            value={reactionsText}
            onChange={(e) => onReactionsTextChange(e.target.value)}
          />
          <TextField
            label="Список спикеров (по одному в строке)"
            size="small"
            multiline
            minRows={3}
            value={speakersText}
            onChange={(e) => onSpeakersTextChange(e.target.value)}
          />
          <Button variant="contained" onClick={onSaveSettings}>
            Сохранить настройки
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
