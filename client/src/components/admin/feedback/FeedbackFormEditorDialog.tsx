import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  buildDefaultFeedbackForm,
  createEmptyOpenField,
  createEmptyScale,
  FEEDBACK_OPEN_FIELD_MAX,
  FEEDBACK_SCALE_MAX_OPTIONS,
  FEEDBACK_SCALE_MIN_OPTIONS,
  type FeedbackOpenField,
  type FeedbackScale,
} from "../../../types/feedback";

export type FeedbackFormDraft = {
  title: string;
  scales: FeedbackScale[];
  openFields: FeedbackOpenField[];
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

  function updateOpenField(index: number, patch: Partial<FeedbackOpenField>) {
    setDraft((prev) => ({
      ...prev,
      openFields: prev.openFields.map((field, idx) =>
        idx === index ? { ...field, ...patch } : field,
      ),
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
          <Typography variant="subtitle1" sx={{ pt: 0.5 }}>
            Открытые поля
          </Typography>
          {draft.openFields.map((field, fieldIndex) => (
            <Box
              key={field.id}
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
                    label={`Поле ${fieldIndex + 1}`}
                    value={field.label}
                    onChange={(e) => updateOpenField(fieldIndex, { label: e.target.value })}
                    fullWidth
                    disabled={readOnly}
                  />
                  <Button
                    color="error"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        openFields: prev.openFields.filter((_, idx) => idx !== fieldIndex),
                      }))
                    }
                    disabled={readOnly}
                    aria-label="Удалить открытое поле"
                  >
                    <DeleteOutlineIcon />
                  </Button>
                </Stack>
                <TextField
                  label="Подсказка в поле"
                  value={field.placeholder}
                  onChange={(e) => updateOpenField(fieldIndex, { placeholder: e.target.value })}
                  fullWidth
                  disabled={readOnly}
                />
              </Stack>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                openFields: [...prev.openFields, createEmptyOpenField("Новое поле")],
              }))
            }
            disabled={readOnly || draft.openFields.length >= FEEDBACK_OPEN_FIELD_MAX}
          >
            Добавить открытое поле
          </Button>
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
  openFields?: FeedbackOpenField[];
  commentEnabled?: boolean;
  commentPlaceholder?: string;
}): FeedbackFormDraft {
  const openFields =
    form.openFields && form.openFields.length > 0
      ? form.openFields
      : form.commentEnabled
        ? [createEmptyOpenField("Комментарий", form.commentPlaceholder ?? "")]
        : [];
  return {
    title: form.title,
    scales: form.scales,
    openFields,
  };
}

export function defaultCreateDraft(): FeedbackFormDraft {
  const defaults = buildDefaultFeedbackForm();
  return {
    title: defaults.title,
    scales: defaults.scales,
    openFields: defaults.openFields,
  };
}
