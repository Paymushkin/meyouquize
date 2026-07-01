import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RateReviewIcon from "@mui/icons-material/RateReview";
import RestoreIcon from "@mui/icons-material/Restore";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { hasOptionVoteCountOverride } from "@meyouquize/shared";
import { API_BASE } from "../../config";
import { socket } from "../../socket";
import {
  type FeedbackFormConfig,
  type FeedbackOpenField,
  type FeedbackResultsPayload,
  feedbackScaleOptionKey,
  hasOpenFieldAnswers,
} from "../../types/feedback";
import {
  defaultCreateDraft,
  draftFromFormConfig,
  FeedbackFormEditorDialog,
  type FeedbackFormDraft,
} from "./feedback/FeedbackFormEditorDialog";
import { FeedbackRowQuickActions } from "./feedback/FeedbackRowQuickActions";
import { VoteCountAdjustControls } from "./VoteCountAdjustControls";

type Props = {
  eventName: string;
  quizId: string;
  onlineUsersCount: number;
};

function resultsMapFromList(
  items: FeedbackResultsPayload[],
): Record<string, FeedbackResultsPayload> {
  return Object.fromEntries(items.map((item) => [item.form.id, item]));
}

export function AdminFeedbackSection({ eventName, quizId, onlineUsersCount }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<FeedbackFormConfig[]>([]);
  const [resultsByFormId, setResultsByFormId] = useState<Record<string, FeedbackResultsPayload>>(
    {},
  );
  const [expandedSettingsFormId, setExpandedSettingsFormId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);
  const [confirmResetFormId, setConfirmResetFormId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [voteAdjustEditFormIds, setVoteAdjustEditFormIds] = useState<Set<string>>(() => new Set());
  const [addResponseDialog, setAddResponseDialog] = useState<{
    formId: string;
    openFields: FeedbackOpenField[];
  } | null>(null);
  const [addResponseNickname, setAddResponseNickname] = useState("");
  const [addResponseFieldValues, setAddResponseFieldValues] = useState<Record<string, string>>({});
  const [addResponseError, setAddResponseError] = useState("");

  const loadForms = useCallback(async () => {
    const response = await fetch(
      `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback`,
      {
        credentials: "include",
      },
    );
    if (!response.ok) {
      return;
    }
    setForms((await response.json()) as FeedbackFormConfig[]);
  }, [eventName]);

  const loadResults = useCallback(async () => {
    const response = await fetch(
      `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback/results`,
      { credentials: "include" },
    );
    if (!response.ok) return;
    const items = (await response.json()) as FeedbackResultsPayload[];
    setResultsByFormId(resultsMapFromList(items));
  }, [eventName]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      await Promise.all([loadForms(), loadResults()]);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadForms, loadResults]);

  useEffect(() => {
    if (!quizId) return;
    socket.emit("feedback:results:subscribe", { quizId });
    const onResults = (payload: FeedbackResultsPayload) => {
      setResultsByFormId((prev) => ({ ...prev, [payload.form.id]: payload }));
      setForms((prev) =>
        prev.map((form) =>
          form.id === payload.form.id
            ? {
                ...form,
                isActive: payload.form.isActive,
                isClosed: payload.form.isClosed,
              }
            : payload.form.isActive && !payload.form.isClosed
              ? { ...form, isActive: false, isClosed: true }
              : form,
        ),
      );
    };
    socket.on("feedback:results", onResults);
    return () => {
      socket.off("feedback:results", onResults);
    };
  }, [quizId]);

  function openCreateDialog() {
    setDialogError("");
    setCreateDialogOpen(true);
  }

  function openEditDialog(formId: string) {
    setDialogError("");
    setEditFormId(formId);
  }

  function setFeedbackScaleCount(
    formId: string,
    scaleId: string,
    optionIndex: number,
    count: number,
  ) {
    socket.emit("feedback:scale-count:set", {
      quizId,
      formId,
      scaleId,
      optionIndex,
      count,
    });
  }

  function clearFeedbackScaleCount(formId: string, scaleId: string, optionIndex: number) {
    socket.emit("feedback:scale-count:clear", {
      quizId,
      formId,
      scaleId,
      optionIndex,
    });
  }

  function clearAllFeedbackScaleCounts(formId: string) {
    socket.emit("feedback:scale-count:clear-all", { quizId, formId });
  }

  function openAddResponseDialog(formId: string, openFields: FeedbackOpenField[]) {
    setAddResponseDialog({ formId, openFields });
    setAddResponseNickname("");
    setAddResponseFieldValues(Object.fromEntries(openFields.map((field) => [field.id, ""])));
    setAddResponseError("");
  }

  function closeAddResponseDialog() {
    setAddResponseDialog(null);
    setAddResponseNickname("");
    setAddResponseFieldValues({});
    setAddResponseError("");
  }

  function submitInjectedResponse() {
    if (!addResponseDialog) return;
    const nickname = addResponseNickname.trim();
    if (!nickname) {
      setAddResponseError("Введите имя");
      return;
    }
    const openFieldAnswers = Object.fromEntries(
      Object.entries(addResponseFieldValues)
        .map(([fieldId, value]) => [fieldId, value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
    if (Object.keys(openFieldAnswers).length === 0) {
      setAddResponseError("Введите текст ответа");
      return;
    }
    socket.emit("feedback:response:add", {
      quizId,
      formId: addResponseDialog.formId,
      nickname,
      openFieldAnswers,
    });
    closeAddResponseDialog();
  }

  function removeInjectedResponse(formId: string, injectedId: string) {
    socket.emit("feedback:response:remove", { quizId, formId, injectedId });
  }

  function toggleVoteAdjustEdit(formId: string) {
    setVoteAdjustEditFormIds((current) => {
      const next = new Set(current);
      if (next.has(formId)) next.delete(formId);
      else next.add(formId);
      return next;
    });
  }

  async function createForm(draft: FeedbackFormDraft) {
    setSaving(true);
    setDialogError("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      if (!response.ok) {
        let errorText = "Не удалось создать форму";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string") errorText = payload.error;
        } catch {
          // ignore
        }
        setDialogError(errorText);
        return;
      }
      const data = (await response.json()) as FeedbackFormConfig;
      setForms((prev) => [...prev, data]);
      setCreateDialogOpen(false);
      await loadResults();
    } finally {
      setSaving(false);
    }
  }

  async function updateForm(formId: string, draft: FeedbackFormDraft) {
    setSaving(true);
    setDialogError("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(eventName)}/feedback/${encodeURIComponent(formId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      if (!response.ok) {
        let errorText = "Не удалось сохранить форму";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string") errorText = payload.error;
        } catch {
          // ignore
        }
        setDialogError(errorText);
        return;
      }
      const data = (await response.json()) as FeedbackFormConfig;
      setForms((prev) => prev.map((form) => (form.id === formId ? data : form)));
      setEditFormId(null);
      await loadResults();
    } finally {
      setSaving(false);
    }
  }

  function toggleFormActive(form: FeedbackFormConfig) {
    const isCollecting = form.isActive && !form.isClosed;
    if (isCollecting) {
      socket.emit("feedback:close", { quizId, formId: form.id });
    } else {
      socket.emit("feedback:activate", { quizId, formId: form.id });
    }
  }

  function resetFormResults(formId: string) {
    socket.emit("feedback:reset-results", { quizId, formId });
    setConfirmResetFormId(null);
  }

  const editForm = editFormId ? (forms.find((form) => form.id === editFormId) ?? null) : null;
  const confirmResetForm = confirmResetFormId
    ? (forms.find((form) => form.id === confirmResetFormId) ?? null)
    : null;

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (forms.length === 0) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            py: 6,
            px: 2,
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<RateReviewIcon sx={{ fontSize: 28 }} />}
            onClick={openCreateDialog}
            sx={{
              py: 2,
              px: 4,
              fontSize: "1.1rem",
              borderRadius: 2,
              boxShadow: 2,
              textTransform: "none",
            }}
          >
            Создать форму
          </Button>
        </Box>
        <FeedbackFormEditorDialog
          open={createDialogOpen}
          mode="create"
          initialDraft={defaultCreateDraft()}
          saving={saving}
          error={dialogError}
          onClose={() => setCreateDialogOpen(false)}
          onSave={(draft) => void createForm(draft)}
        />
      </>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexShrink: 0,
            width: "100%",
          }}
        >
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={openCreateDialog}
            sx={{ textTransform: "none" }}
          >
            Форма
          </Button>
        </Box>
        <Card variant="outlined">
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <List dense disablePadding sx={{ py: 0 }}>
                {forms.map((form) => {
                  const isCollecting = form.isActive && !form.isClosed;
                  const settingsExpanded = expandedSettingsFormId === form.id;
                  const results = resultsByFormId[form.id] ?? null;

                  return (
                    <Box
                      key={form.id}
                      component="li"
                      sx={{ display: "block", listStyle: "none", "& + &": { mt: 0.5 } }}
                    >
                      <Box sx={{ position: "relative" }}>
                        <ListItemButton
                          disableGutters
                          selected={false}
                          onClick={() => {
                            if (!isCollecting) openEditDialog(form.id);
                          }}
                          aria-label={`Форма обратной связи: ${form.title.trim() || "Без названия"}`}
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            py: 0,
                            px: 0,
                            minHeight: 0,
                            borderRadius: 0,
                            bgcolor: "transparent",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              justifyContent: "flex-start",
                              alignItems: "center",
                              gap: 1.25,
                              py: 0.5,
                            }}
                          >
                            <Tooltip title="Обратная связь" enterTouchDelay={400}>
                              <Box
                                component="span"
                                aria-hidden
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  cursor: "help",
                                  lineHeight: 0,
                                }}
                              >
                                <RateReviewIcon
                                  sx={{ fontSize: 16, display: "block" }}
                                  color="action"
                                />
                              </Box>
                            </Tooltip>
                            <Typography
                              component="span"
                              variant="body2"
                              noWrap
                              title={form.title.trim() || undefined}
                              sx={{ minWidth: 0, textAlign: "left" }}
                            >
                              {form.title.trim() || "Без названия"}
                            </Typography>
                          </Box>
                          <FeedbackRowQuickActions
                            formActive={isCollecting}
                            settingsExpanded={settingsExpanded}
                            onToggleActive={(event) => {
                              event.stopPropagation();
                              toggleFormActive(form);
                            }}
                            onToggleSettings={(event) => {
                              event.stopPropagation();
                              setExpandedSettingsFormId((current) =>
                                current === form.id ? null : form.id,
                              );
                            }}
                          />
                        </ListItemButton>
                        <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              px: 1.5,
                              py: 1.5,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: 1.5,
                              mt: 1,
                            }}
                          >
                            <Stack spacing={1.5}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                spacing={0.5}
                              >
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Tooltip
                                    title={
                                      voteAdjustEditFormIds.has(form.id)
                                        ? "Скрыть правку голосов"
                                        : "Правка голосов"
                                    }
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() => toggleVoteAdjustEdit(form.id)}
                                      aria-label={
                                        voteAdjustEditFormIds.has(form.id)
                                          ? "Скрыть правку голосов"
                                          : "Правка голосов"
                                      }
                                      aria-pressed={voteAdjustEditFormIds.has(form.id)}
                                      color={
                                        voteAdjustEditFormIds.has(form.id) ? "primary" : "default"
                                      }
                                    >
                                      <TuneIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {voteAdjustEditFormIds.has(form.id) &&
                                  (results?.scaleCountOverrides?.length ?? 0) > 0 ? (
                                    <Tooltip title="Восстановить все реальные результаты">
                                      <IconButton
                                        size="small"
                                        onClick={() => clearAllFeedbackScaleCounts(form.id)}
                                        aria-label="Восстановить все реальные результаты"
                                      >
                                        <RestoreIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  ) : null}
                                </Stack>
                                <Tooltip
                                  title={
                                    isCollecting
                                      ? "Закройте приём, чтобы обнулить ответы"
                                      : "Обнулить ответы по этой форме"
                                  }
                                >
                                  <span>
                                    <IconButton
                                      color="warning"
                                      size="small"
                                      disabled={isCollecting}
                                      onClick={() => setConfirmResetFormId(form.id)}
                                      aria-label="Обнулить ответы по этой форме"
                                    >
                                      <RestartAltIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                              {isCollecting ? (
                                <Alert severity="warning" sx={{ py: 0.5 }}>
                                  Идёт сбор ответов. Закройте приём на телефонах, чтобы изменить
                                  форму.
                                </Alert>
                              ) : null}
                              {(results?.scaleStats ?? []).map((stat, statIndex) => {
                                const overrides = results?.scaleCountOverrides ?? [];
                                const voteAdjustEditVisible = voteAdjustEditFormIds.has(form.id);
                                const total = stat.counts.reduce((sum, n) => sum + n, 0);
                                return (
                                  <Box key={stat.scaleId}>
                                    {statIndex > 0 ? (
                                      <Divider
                                        component="div"
                                        role="separator"
                                        sx={{ borderColor: "divider", my: 2.5 }}
                                      />
                                    ) : null}
                                    <Typography variant="subtitle2" gutterBottom>
                                      {stat.label}
                                      {stat.average != null ? ` · среднее: ${stat.average}` : ""}
                                    </Typography>
                                    <Stack spacing={0.75}>
                                      {stat.options.map((label, idx) => {
                                        const count = stat.counts[idx] ?? 0;
                                        const pct =
                                          total > 0 ? Math.round((count / total) * 100) : 0;
                                        const optionKey = feedbackScaleOptionKey(stat.scaleId, idx);
                                        return (
                                          <Box key={`${stat.scaleId}-${idx}`}>
                                            <Stack
                                              direction="row"
                                              justifyContent="space-between"
                                              alignItems="center"
                                            >
                                              <Typography variant="body2">{label}</Typography>
                                              <Stack
                                                direction="row"
                                                spacing={0.75}
                                                alignItems="center"
                                              >
                                                <Typography variant="body2" color="text.secondary">
                                                  ({pct}%)
                                                </Typography>
                                                {voteAdjustEditVisible ? (
                                                  <VoteCountAdjustControls
                                                    count={count}
                                                    hasOverride={hasOptionVoteCountOverride(
                                                      overrides,
                                                      optionKey,
                                                    )}
                                                    onDecrement={() =>
                                                      setFeedbackScaleCount(
                                                        form.id,
                                                        stat.scaleId,
                                                        idx,
                                                        count - 1,
                                                      )
                                                    }
                                                    onIncrement={() =>
                                                      setFeedbackScaleCount(
                                                        form.id,
                                                        stat.scaleId,
                                                        idx,
                                                        count + 1,
                                                      )
                                                    }
                                                    onRestore={() =>
                                                      clearFeedbackScaleCount(
                                                        form.id,
                                                        stat.scaleId,
                                                        idx,
                                                      )
                                                    }
                                                  />
                                                ) : (
                                                  <Typography variant="body2">{count}</Typography>
                                                )}
                                              </Stack>
                                            </Stack>
                                            <LinearProgress
                                              variant="determinate"
                                              value={pct}
                                              sx={{ height: 8, borderRadius: 1 }}
                                            />
                                          </Box>
                                        );
                                      })}
                                    </Stack>
                                    <Stack
                                      direction="row"
                                      justifyContent="space-between"
                                      alignItems="center"
                                      sx={{ mt: 1 }}
                                    >
                                      <Typography variant="body2" color="text.secondary">
                                        Всего
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {total}
                                      </Typography>
                                    </Stack>
                                  </Box>
                                );
                              })}
                              {(results?.form.openFields ?? []).length > 0 ? (
                                <Stack spacing={1.5}>
                                  {(results?.scaleStats ?? []).length > 0 ? (
                                    <Divider
                                      component="div"
                                      role="separator"
                                      sx={{ borderColor: "divider", my: 2.5 }}
                                    />
                                  ) : null}
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    spacing={1}
                                  >
                                    <Typography variant="subtitle2">Текстовые ответы</Typography>
                                    <Button
                                      size="small"
                                      startIcon={<AddIcon />}
                                      onClick={() =>
                                        openAddResponseDialog(
                                          form.id,
                                          results?.form.openFields ?? [],
                                        )
                                      }
                                    >
                                      Добавить ответ
                                    </Button>
                                  </Stack>
                                  {(results?.responses ?? []).filter((row) =>
                                    hasOpenFieldAnswers(row.openFieldAnswers, row.comment),
                                  ).length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Пока нет ответов
                                    </Typography>
                                  ) : (
                                    (results?.responses ?? [])
                                      .filter((row) =>
                                        hasOpenFieldAnswers(row.openFieldAnswers, row.comment),
                                      )
                                      .map((row) => {
                                        const rowKey =
                                          row.injectedId ?? `${row.nickname}-${row.submittedAt}`;
                                        return (
                                          <Box
                                            key={rowKey}
                                            sx={{
                                              p: 1.5,
                                              bgcolor: row.isInjected
                                                ? "action.selected"
                                                : "action.hover",
                                              borderRadius: 1,
                                            }}
                                          >
                                            <Stack
                                              direction="row"
                                              alignItems="flex-start"
                                              justifyContent="space-between"
                                              spacing={1}
                                            >
                                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {row.nickname}
                                                {row.isInjected ? (
                                                  <Typography
                                                    component="span"
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ ml: 1 }}
                                                  >
                                                    (добавлено вручную)
                                                  </Typography>
                                                ) : null}
                                              </Typography>
                                              {row.isInjected && row.injectedId ? (
                                                <Tooltip title="Удалить ответ">
                                                  <IconButton
                                                    size="small"
                                                    aria-label="Удалить ответ"
                                                    onClick={() =>
                                                      removeInjectedResponse(
                                                        form.id,
                                                        row.injectedId!,
                                                      )
                                                    }
                                                  >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              ) : null}
                                            </Stack>
                                            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                              {(results?.form.openFields ?? []).map((field) => {
                                                const text = row.openFieldAnswers[field.id]?.trim();
                                                if (!text) return null;
                                                return (
                                                  <Box key={`${rowKey}-${field.id}`}>
                                                    {(results?.form.openFields ?? []).length > 1 ? (
                                                      <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                      >
                                                        {field.label}
                                                      </Typography>
                                                    ) : null}
                                                    <Typography variant="body2">{text}</Typography>
                                                  </Box>
                                                );
                                              })}
                                            </Stack>
                                          </Box>
                                        );
                                      })
                                  )}
                                </Stack>
                              ) : (results?.responses ?? []).some((row) =>
                                  hasOpenFieldAnswers(row.openFieldAnswers, row.comment),
                                ) && (results?.form.openFields ?? []).length === 0 ? (
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2">Комментарии</Typography>
                                  {results?.responses
                                    .filter((row) => row.comment)
                                    .map((row) => (
                                      <Box
                                        key={`${row.nickname}-${row.submittedAt}`}
                                        sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}
                                      >
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {row.nickname}
                                        </Typography>
                                        <Typography variant="body2">{row.comment}</Typography>
                                      </Box>
                                    ))}
                                </Stack>
                              ) : null}
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    </Box>
                  );
                })}
              </List>
            </Box>
          </CardContent>
        </Card>
      </Stack>
      <FeedbackFormEditorDialog
        open={createDialogOpen}
        mode="create"
        initialDraft={defaultCreateDraft()}
        saving={saving}
        error={dialogError}
        onClose={() => setCreateDialogOpen(false)}
        onSave={(draft) => void createForm(draft)}
      />
      {editForm ? (
        <FeedbackFormEditorDialog
          open={Boolean(editFormId)}
          mode="edit"
          initialDraft={draftFromFormConfig(editForm)}
          saving={saving}
          readOnly={editForm.isActive && !editForm.isClosed}
          error={dialogError}
          onClose={() => setEditFormId(null)}
          onSave={(draft) => void updateForm(editForm.id, draft)}
        />
      ) : null}
      <Dialog
        open={confirmResetFormId !== null}
        onClose={() => setConfirmResetFormId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Обнулить результаты?</DialogTitle>
        <DialogContent>
          <Typography>
            Будут удалены все ответы по форме «{confirmResetForm?.title.trim() || "Без названия"}»,
            в том числе добавленные вручную, и сброшены ручные правки голосов. Действие нельзя
            отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResetFormId(null)}>Отмена</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              if (confirmResetFormId) resetFormResults(confirmResetFormId);
            }}
          >
            Обнулить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={addResponseDialog !== null}
        onClose={closeAddResponseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить ответ</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Имя"
              placeholder="Например: Гость"
              value={addResponseNickname}
              onChange={(e) => setAddResponseNickname(e.target.value)}
              fullWidth
            />
            {(addResponseDialog?.openFields ?? []).map((field) => (
              <TextField
                key={field.id}
                label={field.label}
                placeholder={field.placeholder || "Текст ответа"}
                value={addResponseFieldValues[field.id] ?? ""}
                onChange={(e) =>
                  setAddResponseFieldValues((prev) => ({
                    ...prev,
                    [field.id]: e.target.value,
                  }))
                }
                multiline
                minRows={2}
                fullWidth
              />
            ))}
            {addResponseError ? (
              <Typography variant="body2" color="error">
                {addResponseError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddResponseDialog}>Отмена</Button>
          <Button variant="contained" onClick={submitInjectedResponse}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
