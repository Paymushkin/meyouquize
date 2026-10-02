import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { createSpeakerSessionId } from "@meyouquize/shared";
import type {
  AdminSpeakerQuestionsPanelActions,
  AdminSpeakerQuestionsSettingsValues,
  AdminSpeakerSessionDraft,
} from "../../features/speakerQuestionsAdmin/adminSpeakerQuestionsSettings";

type Props = {
  settings: AdminSpeakerQuestionsSettingsValues;
  actions: AdminSpeakerQuestionsPanelActions;
};

type SessionEditorState = { mode: "create" } | { mode: "edit"; session: AdminSpeakerSessionDraft };

function countSpeakers(speakersText: string): number {
  return speakersText
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean).length;
}

export function AdminSpeakerSettingsPanel({ settings, actions }: Props) {
  const {
    enabled,
    reactionsText,
    showAuthorOnScreen,
    showRecipientOnScreen,
    showReactionsOnScreen,
    allowAllSpeakersTarget,
    moderatorShowAll,
    sessions,
    activeSpeakerSessionId,
  } = settings;
  const {
    onToggleEnabled,
    onReactionsTextChange,
    onToggleShowAuthorOnScreen,
    onToggleShowRecipientOnScreen,
    onToggleShowReactionsOnScreen,
    onToggleAllowAllSpeakersTarget,
    onToggleModeratorShowAll,
    onPersistSessions,
    onActiveSpeakerSessionIdChange,
    onSaveSettings,
    moderatorPageUrl,
  } = actions;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<SessionEditorState | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSpeakersText, setDraftSpeakersText] = useState("");

  const openCreate = () => {
    setEditor({ mode: "create" });
    setDraftName(`Сессия ${sessions.length + 1}`);
    setDraftSpeakersText("");
  };

  const openEdit = (session: AdminSpeakerSessionDraft) => {
    setEditor({ mode: "edit", session });
    setDraftName(session.name);
    setDraftSpeakersText(session.speakersText);
  };

  const closeEditor = () => setEditor(null);

  const saveEditor = () => {
    if (!editor) return;
    const name = draftName.trim() || "Сессия";
    if (editor.mode === "create") {
      const id = createSpeakerSessionId();
      const next: AdminSpeakerSessionDraft = { id, name, speakersText: draftSpeakersText };
      const nextSessions = [...sessions, next];
      if (!activeSpeakerSessionId) {
        onPersistSessions(nextSessions, id);
      } else {
        onPersistSessions(nextSessions);
      }
    } else {
      onPersistSessions(
        sessions.map((s) =>
          s.id === editor.session.id ? { ...s, name, speakersText: draftSpeakersText } : s,
        ),
      );
    }
    closeEditor();
  };

  const removeSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    if (activeSpeakerSessionId === id) {
      onPersistSessions(next, next[0]?.id ?? null);
    } else {
      onPersistSessions(next);
    }
  };

  const closeSettings = () => {
    setSettingsOpen(false);
    onSaveSettings();
  };

  const dialogTitle = editor?.mode === "edit" ? "Редактировать сессию" : "Новая сессия";

  const sessionRows = useMemo(
    () =>
      sessions.map((session) => {
        const n = countSpeakers(session.speakersText);
        return {
          session,
          speakersLabel: n === 0 ? "нет спикеров" : `${n} сп.`,
        };
      }),
    [sessions],
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="h6">Вопросы спикерам</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                startIcon={<SettingsOutlinedIcon fontSize="small" />}
                onClick={() => setSettingsOpen(true)}
              >
                Настройки
              </Button>
              {moderatorPageUrl ? (
                <Button
                  component="a"
                  href={moderatorPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                >
                  Модератор
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Stack spacing={0.75}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography variant="subtitle2">Сессии</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
                Добавить
              </Button>
            </Stack>
            {sessionRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Сессий пока нет
              </Typography>
            ) : (
              <Stack spacing={0.25}>
                {sessionRows.map(({ session, speakersLabel }) => {
                  const isActive = activeSpeakerSessionId === session.id;
                  return (
                    <Stack
                      key={session.id}
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{
                        minHeight: 36,
                        px: 0.5,
                        borderRadius: 1,
                        bgcolor: isActive ? "rgba(124, 90, 203, 0.18)" : "transparent",
                      }}
                    >
                      <Radio
                        size="small"
                        checked={isActive}
                        onChange={() => onActiveSpeakerSessionIdChange(session.id)}
                        inputProps={{ "aria-label": `Активная сессия: ${session.name}` }}
                        sx={{ p: 0.5 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                        noWrap
                        title={session.name}
                      >
                        {session.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flexShrink: 0, minWidth: 64, textAlign: "right" }}
                      >
                        {speakersLabel}
                      </Typography>
                      <IconButton
                        aria-label={`Редактировать сессию ${session.name}`}
                        onClick={() => openEdit(session)}
                        size="small"
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={`Удалить сессию ${session.name}`}
                        onClick={() => removeSession(session.id)}
                        size="small"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary">
              Активная сессия — список спикеров у игроков
            </Typography>
          </Stack>
        </Stack>
      </CardContent>

      <Dialog open={settingsOpen} onClose={closeSettings} fullWidth maxWidth="sm">
        <DialogTitle>Настройки вопросов спикерам</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={<Switch checked={enabled} onChange={(_, v) => onToggleEnabled(v)} />}
                label="Кнопка у пользователей"
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={showAuthorOnScreen}
                    onChange={(_, v) => onToggleShowAuthorOnScreen(v)}
                  />
                }
                label="Автор на экране"
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={showRecipientOnScreen}
                    onChange={(_, v) => onToggleShowRecipientOnScreen(v)}
                  />
                }
                label="«Кому» на экране"
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={showReactionsOnScreen}
                    onChange={(_, v) => onToggleShowReactionsOnScreen(v)}
                  />
                }
                label="Реакции на экране"
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={allowAllSpeakersTarget}
                    onChange={(_, v) => onToggleAllowAllSpeakersTarget(v)}
                  />
                }
                label="Вариант «Всем спикерам» у игроков"
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={moderatorShowAll}
                    onChange={(_, v) => onToggleModeratorShowAll(v)}
                  />
                }
                label="На странице модератора — все вопросы (иначе только одобренные)"
              />
            </Stack>
            <TextField
              label="Реакции (по одной в строке, например 👍)"
              size="small"
              multiline
              minRows={2}
              value={reactionsText}
              onChange={(e) => onReactionsTextChange(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSettings}>Готово</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editor != null} onClose={closeEditor} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              size="small"
              label="Название сессии"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Спикеры (по одному в строке)"
              size="small"
              multiline
              minRows={4}
              value={draftSpeakersText}
              onChange={(e) => setDraftSpeakersText(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor}>Отмена</Button>
          <Button variant="contained" onClick={saveEditor}>
            {editor?.mode === "edit" ? "Сохранить" : "Создать"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
