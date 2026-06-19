import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  buildDefaultFeedbackForm,
  createEmptyScale,
  type FeedbackScale,
} from "../../../types/feedback";

export type FeedbackFormDraft = {
  title: string;
  scales: FeedbackScale[];
  commentEnabled: boolean;
  commentPlaceholder: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialDraft: FeedbackFormDraft;
  saving: boolean;
  readOnly?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: FeedbackFormDraft) => void;
};

export function FeedbackFormEditorDialog(props: Props) {
  const { open, mode, initialDraft, saving, readOnly = false, error, onClose, onSave } = props;
  const [draft, setDraft] = useState<FeedbackFormDraft>(initialDraft);

  useEffect(() => {
    if (open) setDraft(initialDraft);
  }, [open, initialDraft]);

  function updateScale(index: number, patch: Partial<FeedbackScale>) {
    setDraft((prev) => ({
      ...prev,
      scales: prev.scales.map((scale, idx) => (idx === index ? { ...scale, ...patch } : scale)),
    }));
  }

  function updateScaleOption(scaleIndex: number, optionIndex: number, value: string) {
    setDraft((prev) => ({
      ...prev,
      scales: prev.scales.map((scale, idx) => {
        if (idx !== scaleIndex) return scale;
        const options = [...scale.options] as FeedbackScale["options"];
        options[optionIndex] = value;
        return { ...scale, options };
      }),
    }));
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {mode === "create" ? "Создать форму обратной связи" : "Редактировать форму"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Заголовок формы"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            fullWidth
            disabled={readOnly}
          />
          {draft.scales.map((scale, scaleIndex) => (
            <Box
              key={scale.id}
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label={`Шкала ${scaleIndex + 1}`}
                    value={scale.label}
                    onChange={(e) => updateScale(scaleIndex, { label: e.target.value })}
                    fullWidth
                    disabled={readOnly}
                  />
                  <Button
                    color="error"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        scales: prev.scales.filter((_, idx) => idx !== scaleIndex),
                      }))
                    }
                    disabled={readOnly || draft.scales.length <= 1}
                    aria-label="Удалить шкалу"
                  >
                    <DeleteOutlineIcon />
                  </Button>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {scale.options.map((option, optionIndex) => (
                    <TextField
                      key={`${scale.id}-${optionIndex}`}
                      label={`Вариант ${optionIndex + 1}`}
                      value={option}
                      onChange={(e) => updateScaleOption(scaleIndex, optionIndex, e.target.value)}
                      fullWidth
                      disabled={readOnly}
                    />
                  ))}
                </Stack>
              </Stack>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                scales: [...prev.scales, createEmptyScale("Новая шкала")],
              }))
            }
            disabled={readOnly || draft.scales.length >= 10}
          >
            Добавить шкалу
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.commentEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, commentEnabled: e.target.checked }))
                }
                disabled={readOnly}
              />
            }
            label="Показывать поле комментария"
          />
          {draft.commentEnabled ? (
            <TextField
              label="Placeholder комментария"
              value={draft.commentPlaceholder}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, commentPlaceholder: e.target.value }))
              }
              fullWidth
              disabled={readOnly}
            />
          ) : null}
          {readOnly ? (
            <Alert severity="warning">
              Идёт сбор ответов. Закройте приём на телефонах, чтобы изменить форму.
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        {!readOnly ? (
          <Button variant="contained" disabled={saving} onClick={() => onSave(draft)}>
            {mode === "create" ? "Создать" : "Сохранить"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

export function draftFromFormConfig(form: {
  title: string;
  scales: FeedbackScale[];
  commentEnabled: boolean;
  commentPlaceholder: string;
}): FeedbackFormDraft {
  return {
    title: form.title,
    scales: form.scales,
    commentEnabled: form.commentEnabled,
    commentPlaceholder: form.commentPlaceholder,
  };
}

export function defaultCreateDraft(): FeedbackFormDraft {
  return buildDefaultFeedbackForm();
}
