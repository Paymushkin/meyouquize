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
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  buildDefaultFeedbackForm,
  createEmptyScale,
  FEEDBACK_SCALE_MAX_OPTIONS,
  FEEDBACK_SCALE_MIN_OPTIONS,
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
  const [newOptionByScaleId, setNewOptionByScaleId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDraft(initialDraft);
      setNewOptionByScaleId({});
    }
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

  function removeScaleOption(scaleIndex: number, optionIndex: number) {
    setDraft((prev) => ({
      ...prev,
      scales: prev.scales.map((scale, idx) => {
        if (idx !== scaleIndex) return scale;
        if (scale.options.length <= FEEDBACK_SCALE_MIN_OPTIONS) return scale;
        return { ...scale, options: scale.options.filter((_, i) => i !== optionIndex) };
      }),
    }));
  }

  function commitNewScaleOption(scaleIndex: number) {
    const scale = draft.scales[scaleIndex];
    if (!scale) return;
    const value = (newOptionByScaleId[scale.id] ?? "").trim();
    if (!value || scale.options.length >= FEEDBACK_SCALE_MAX_OPTIONS) return;
    setDraft((prev) => ({
      ...prev,
      scales: prev.scales.map((item, idx) =>
        idx === scaleIndex ? { ...item, options: [...item.options, value] } : item,
      ),
    }));
    setNewOptionByScaleId((prev) => ({ ...prev, [scale.id]: "" }));
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
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                  {scale.options.map((option, optionIndex) => (
                    <Stack
                      key={`${scale.id}-${optionIndex}`}
                      spacing={0.25}
                      sx={{ flex: { sm: "1 1 0" }, minWidth: { sm: 100 }, maxWidth: "100%" }}
                    >
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeScaleOption(scaleIndex, optionIndex)}
                        disabled={readOnly || scale.options.length <= FEEDBACK_SCALE_MIN_OPTIONS}
                        aria-label={`Удалить вариант ${optionIndex + 1}`}
                        sx={{ alignSelf: "flex-start", ml: -0.5 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        label={`Вариант ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => updateScaleOption(scaleIndex, optionIndex, e.target.value)}
                        size="small"
                        fullWidth
                        disabled={readOnly}
                      />
                    </Stack>
                  ))}
                </Stack>
                {!readOnly && scale.options.length < FEEDBACK_SCALE_MAX_OPTIONS ? (
                  <TextField
                    label="Новый вариант (введите и нажмите Enter)"
                    placeholder="Текст нового варианта"
                    value={newOptionByScaleId[scale.id] ?? ""}
                    onChange={(e) =>
                      setNewOptionByScaleId((prev) => ({ ...prev, [scale.id]: e.target.value }))
                    }
                    onBlur={() => commitNewScaleOption(scaleIndex)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitNewScaleOption(scaleIndex);
                      }
                    }}
                    size="small"
                    fullWidth
                    disabled={readOnly}
                  />
                ) : null}
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
