import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import {
  getQuestionTypeSelectValue,
  isEditorQuizMode,
  questionAllowsOptionImages,
  questionAllowsQuestionImage,
  type OptionForm,
  type QuestionForm,
  type QuestionType,
} from "../../admin/adminEventForm";
import { BrandImageUploadTile } from "../../components/admin/branding/BrandImageUploadTile";
import { ImagePreview } from "../../components/admin/branding/ImagePreview";

export type AdminEventQuestionDialogProps = {
  open: boolean;
  question: QuestionForm | undefined;
  dialogError: string;
  onDialogError: Dispatch<SetStateAction<string>>;
  defaultRankingQuizHint: string;
  defaultRankingJuryHint: string;
  newOptionText: string;
  setNewOptionText: Dispatch<SetStateAction<string>>;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  onRequestRemove: () => void;
  onUpdateQuestion: (patch: Partial<QuestionForm>) => void;
  onUpdateOption: (optionIndex: number, patch: Partial<OptionForm>) => void;
  onRemoveOption: (optionIndex: number) => void;
  onCommitNewOption: () => void;
  onSetTagCloudTagPointsAt: (tagIdx: number, raw: string) => void;
  onSetRankingTierAt: (rankIdx: number, raw: string) => void;
  onFillRankingTiersDescending: () => void;
  uploadBannerMedia: (file: File) => Promise<string>;
};

export function AdminEventQuestionDialog({
  open,
  question,
  dialogError,
  onDialogError,
  defaultRankingQuizHint,
  defaultRankingJuryHint,
  newOptionText,
  setNewOptionText,
  onCancel,
  onSave,
  onRequestRemove,
  onUpdateQuestion,
  onUpdateOption,
  onRemoveOption,
  onCommitNewOption,
  onSetTagCloudTagPointsAt,
  onSetRankingTierAt,
  onFillRankingTiersDescending,
  uploadBannerMedia,
}: AdminEventQuestionDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth aria-label="Редактор вопроса">
      <DialogTitle
        sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 1, px: 1 }}
      >
        <IconButton onClick={onCancel} size="small" aria-label="Закрыть без сохранения">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {question && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!!dialogError && (
              <Alert severity="error" onClose={() => onDialogError("")}>
                {dialogError}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Текст вопроса"
                value={question.text}
                onChange={(e) => onUpdateQuestion({ text: e.target.value })}
                fullWidth
                size="small"
                multiline
                minRows={1}
                maxRows={12}
              />
              {question.type === "ranking" && (
                <TextField
                  size="small"
                  label="Подсказка игроку (ранжирование)"
                  value={question.rankingPlayerHint ?? ""}
                  onChange={(e) =>
                    onUpdateQuestion({
                      rankingPlayerHint: e.target.value,
                    })
                  }
                  helperText="Необязательно. Если пусто — показывается стандартная подсказка."
                  placeholder="Например: Расставьте варианты по стоимости от большей к меньшей."
                  multiline
                  minRows={1}
                  maxRows={3}
                  fullWidth
                />
              )}
              {question.type === "temperature" && (
                <TextField
                  size="small"
                  label="Подзаголовок"
                  value={question.temperatureSubtitle ?? ""}
                  onChange={(e) =>
                    onUpdateQuestion({
                      temperatureSubtitle: e.target.value,
                    })
                  }
                  helperText="Необязательно. Показывается на проекторе над шкалой."
                  placeholder="Например: Оцените уровень вовлечённости аудитории"
                  multiline
                  minRows={1}
                  maxRows={3}
                  fullWidth
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(question.useImages)}
                    onChange={(e) => {
                      if (!question) return;
                      const checked = e.target.checked;
                      if (!checked) {
                        onUpdateQuestion({
                          useImages: false,
                          imageUrl: undefined,
                          options: question.options.map((option) => ({
                            ...option,
                            imageUrl: undefined,
                          })),
                        });
                        return;
                      }
                      onUpdateQuestion({ useImages: true });
                    }}
                  />
                }
                label={question.type === "tag_cloud" ? "Картинка у вопроса" : "Вопрос с картинками"}
              />
              {question.type === "tag_cloud" && question.useImages ? (
                <Typography variant="caption" color="text.secondary">
                  У эталонных тегов картинки не поддерживаются.
                </Typography>
              ) : null}
              {questionAllowsQuestionImage(question) ? (
                <>
                  <BrandImageUploadTile
                    title="Картинка вопроса"
                    value={question.imageUrl ?? ""}
                    uploadErrorLabel="Не удалось загрузить картинку"
                    onUploadMedia={uploadBannerMedia}
                    onUploaded={(url) => onUpdateQuestion({ imageUrl: url })}
                    onClear={() => onUpdateQuestion({ imageUrl: undefined })}
                    clearLabel="Убрать картинку вопроса"
                    onError={(message) => onDialogError(message)}
                  />
                </>
              ) : null}
            </Stack>
            <Divider />

            {(question.type !== "tag_cloud" || isEditorQuizMode(question)) && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {question.type === "tag_cloud"
                    ? "Эталонные теги"
                    : question.type === "ranking"
                      ? question.rankingKind === "quiz"
                        ? "Варианты (для квиза эталон задаётся в колонке «Эталон (место)»)"
                        : "Варианты (для жюри эталон не используется)"
                      : "Варианты ответов"}
                </Typography>
                {question.type === "tag_cloud" && isEditorQuizMode(question) ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
                    Синонимы в одном теге — через «;» или «,», например: «Синий; Голубой».
                  </Typography>
                ) : null}
                <Stack spacing={1.25}>
                  {question.options.map((option, oIndex) => (
                    <Stack
                      key={`q-o-${oIndex}`}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      sx={{ width: "100%", minWidth: 0 }}
                    >
                      <TextField
                        label={
                          question.type === "tag_cloud"
                            ? `Тег ${oIndex + 1}`
                            : `Вариант ${oIndex + 1}`
                        }
                        value={option.text}
                        onChange={(e) => onUpdateOption(oIndex, { text: e.target.value })}
                        placeholder={question.type === "tag_cloud" ? "Синий; Голубой" : undefined}
                        size="small"
                        multiline
                        minRows={1}
                        maxRows={8}
                        sx={{ flex: 1, minWidth: 0 }}
                      />
                      {questionAllowsOptionImages(question) ? (
                        <Stack spacing={0.5} sx={{ width: 72, flexShrink: 0 }}>
                          <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            sx={{ p: 0, minWidth: 0, width: 72, height: 56, overflow: "hidden" }}
                          >
                            <input
                              hidden
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.currentTarget.files?.[0];
                                e.currentTarget.value = "";
                                if (!file) return;
                                try {
                                  const url = await uploadBannerMedia(file);
                                  onUpdateOption(oIndex, { imageUrl: url });
                                } catch (error) {
                                  onDialogError(
                                    error instanceof Error
                                      ? error.message
                                      : "Не удалось загрузить картинку",
                                  );
                                }
                              }}
                            />
                            <ImagePreview
                              label={`Вариант ${oIndex + 1}`}
                              url={option.imageUrl ?? ""}
                              height={56}
                            />
                          </Button>
                          {option.imageUrl?.trim() ? (
                            <Button
                              size="small"
                              color="inherit"
                              sx={{ minWidth: 0, px: 0.5 }}
                              onClick={() =>
                                onUpdateOption(oIndex, {
                                  imageUrl: undefined,
                                })
                              }
                            >
                              ×
                            </Button>
                          ) : null}
                        </Stack>
                      ) : null}
                      {question.type === "tag_cloud" && isEditorQuizMode(question) && (
                        <TextField
                          type="number"
                          size="small"
                          label="Баллы"
                          inputProps={{
                            min: 0,
                            max: 10_000,
                            "aria-label": `Баллы за тег ${oIndex + 1}`,
                          }}
                          value={question.rankingPointsByRank?.[oIndex] ?? 1}
                          onChange={(e) => onSetTagCloudTagPointsAt(oIndex, e.target.value)}
                          sx={{ width: 88, flexShrink: 0 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      )}
                      {question.type === "ranking" && (
                        <TextField
                          type="number"
                          size="small"
                          label={
                            question.rankingKind === "jury"
                              ? `${oIndex + 1}-е место`
                              : "Эталон (место)"
                          }
                          inputProps={{
                            min: question.rankingKind === "jury" ? 0 : 1,
                            max: question.rankingKind === "jury" ? 10000 : question.options.length,
                            "aria-label":
                              question.rankingKind === "jury"
                                ? `Балл за ${oIndex + 1}-е место`
                                : `Место варианта ${oIndex + 1} в скрытом эталоне`,
                          }}
                          value={question.rankingPointsByRank?.[oIndex] ?? ""}
                          onChange={(e) => onSetRankingTierAt(oIndex, e.target.value)}
                          sx={{ width: 118, flexShrink: 0 }}
                        />
                      )}
                      {question.type === "temperature" && (
                        <TextField
                          type="number"
                          size="small"
                          label="Вес 0–100"
                          inputProps={{
                            min: 0,
                            max: 100,
                            "aria-label": `Вес варианта ${oIndex + 1}`,
                          }}
                          value={option.weight ?? ""}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const weight = Number.isFinite(raw)
                              ? Math.max(0, Math.min(100, Math.trunc(raw)))
                              : undefined;
                            onUpdateOption(oIndex, { weight });
                          }}
                          sx={{ width: 108, flexShrink: 0 }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      )}
                      {isEditorQuizMode(question) &&
                        question.type !== "tag_cloud" &&
                        question.type !== "ranking" &&
                        question.type !== "temperature" && (
                          <Stack
                            direction="row"
                            spacing={0}
                            sx={{ flexShrink: 0, pt: 0.5 }}
                            aria-label="Правильность ответа"
                          >
                            <Tooltip title="Правильный">
                              <IconButton
                                size="small"
                                color={option.isCorrect ? "success" : "default"}
                                onClick={() => {
                                  onUpdateOption(oIndex, {
                                    isCorrect: true,
                                  });
                                }}
                                aria-pressed={option.isCorrect}
                                aria-label="Отметить как правильный"
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Неверный">
                              <IconButton
                                size="small"
                                color={!option.isCorrect ? "error" : "default"}
                                onClick={() => {
                                  onUpdateOption(oIndex, {
                                    isCorrect: false,
                                  });
                                }}
                                aria-pressed={!option.isCorrect}
                                aria-label="Отметить как неверный"
                              >
                                <HighlightOffOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      <IconButton
                        onClick={() => onRemoveOption(oIndex)}
                        disabled={
                          question.type === "tag_cloud" && isEditorQuizMode(question)
                            ? question.options.length <= 1
                            : question.type === "ranking"
                              ? question.options.length <= 3
                              : question.options.length <= 2
                        }
                        sx={{ flexShrink: 0, mt: 0.5 }}
                        aria-label="Удалить вариант"
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <TextField
                  label="Новый вариант (введите и нажмите Enter)"
                  placeholder="Текст нового варианта"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  onBlur={onCommitNewOption}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onCommitNewOption();
                    }
                  }}
                  size="small"
                  fullWidth
                />
              </>
            )}
            <Divider />
            <Stack
              direction="row"
              flexWrap="wrap"
              spacing={1.5}
              useFlexGap
              sx={{ alignItems: "flex-start", width: "100%" }}
            >
              <TextField
                select
                label="Тип ответа"
                value={getQuestionTypeSelectValue(question)}
                onChange={(e) => {
                  const value = e.target.value as
                    | "single"
                    | "multi"
                    | "ranking"
                    | "tag_cloud"
                    | "poll"
                    | "temperature";
                  if (value === "poll") {
                    onUpdateQuestion({
                      type: "single",
                      editorQuizMode: false,
                      options: question.options.map((opt) => ({
                        ...opt,
                        isCorrect: false,
                      })),
                    });
                    return;
                  }
                  if (value === "temperature") {
                    onUpdateQuestion({
                      type: "temperature",
                      editorQuizMode: false,
                    });
                    return;
                  }
                  onUpdateQuestion({
                    type: value as QuestionType,
                    editorQuizMode: true,
                  });
                }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{
                  flex: "1 1 220px",
                  minWidth: { xs: "100%", sm: 220 },
                  maxWidth: "100%",
                }}
              >
                <MenuItem value="poll">Обычное голосование</MenuItem>
                <MenuItem value="single">Один правильный</MenuItem>
                <MenuItem value="multi">Несколько правильных</MenuItem>
                <MenuItem value="ranking">Ранжирование</MenuItem>
                <MenuItem value="tag_cloud">Облако тегов</MenuItem>
                <MenuItem value="temperature">Измерение температуры</MenuItem>
              </TextField>
              {question.type === "tag_cloud" ? (
                <TextField
                  type="number"
                  label="Макс. ответов"
                  value={question.maxAnswers}
                  onChange={(e) =>
                    onUpdateQuestion({
                      maxAnswers: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{
                    flex: "0 1 140px",
                    width: { xs: "100%", sm: 140 },
                    maxWidth: "100%",
                  }}
                  helperText="От 1 до 5"
                />
              ) : null}
              {isEditorQuizMode(question) &&
                (question.type === "ranking"
                  ? question.subQuizId != null && question.rankingKind !== "jury"
                  : question.subQuizId != null) && (
                  <TextField
                    type="number"
                    label={
                      question.type === "ranking" || question.type === "tag_cloud"
                        ? "Баллы за полный ответ"
                        : "Баллы"
                    }
                    value={question.points}
                    onChange={(e) =>
                      onUpdateQuestion({
                        points: Number(e.target.value) || 1,
                      })
                    }
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    helperText={
                      question.type === "tag_cloud"
                        ? `Полный балл: ${question.maxAnswers} ответа из разных эталонных тегов (синонимы в одной строке — один тег). Иначе — сумма баллов за каждый новый эталон.`
                        : undefined
                    }
                    sx={{
                      flex:
                        question.type === "ranking" || question.type === "tag_cloud"
                          ? "1 1 200px"
                          : "0 1 100px",
                      width: {
                        xs: "100%",
                        sm:
                          question.type === "ranking" || question.type === "tag_cloud" ? 200 : 100,
                      },
                      maxWidth: "100%",
                    }}
                  />
                )}
            </Stack>
            {question.type === "ranking" && (
              <Stack spacing={1.25} sx={{ pt: 0.25 }}>
                <Typography variant="overline" color="text.secondary">
                  Настройки ранжирования
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: "100%" }}>
                  <TextField
                    select
                    label="Режим"
                    value={question.rankingKind ?? "jury"}
                    onChange={(e) =>
                      onUpdateQuestion({
                        rankingKind: e.target.value as "quiz" | "jury",
                        rankingPointsByRank:
                          (e.target.value as "quiz" | "jury") === "jury"
                            ? Array.from({ length: question.options.length }, (_, j) =>
                                Math.max(1, question.options.length - j),
                              )
                            : Array.from({ length: question.options.length }, (_, j) => j + 1),
                        rankingPlayerHint:
                          (question.rankingPlayerHint ?? "").trim().length > 0
                            ? question.rankingPlayerHint
                            : (e.target.value as "quiz" | "jury") === "quiz"
                              ? defaultRankingQuizHint
                              : defaultRankingJuryHint,
                      })
                    }
                    size="small"
                    sx={{ minWidth: 320, flex: 1 }}
                  >
                    <MenuItem value="quiz">Квиз (эталон и зачёт баллов)</MenuItem>
                    <MenuItem value="jury">Жюри (без эталона и без зачёта в таблице)</MenuItem>
                  </TextField>
                  <Tooltip
                    title={
                      question.rankingKind === "jury"
                        ? "Жюри: нет эталона и зачёта в таблице лидеров; баллы в колонке у строк задают награду за 1-е, 2-е… место в ответе (для сводки на проекторе)."
                        : "Квиз: засчитывается только полное совпадение порядка с эталоном."
                    }
                  >
                    <IconButton size="small" aria-label="Подсказка по режиму ранжирования">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                {question.rankingKind === "jury" ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Баллы у каждой строки — за 1-е, 2-е… место в ответе участника. Для жюри все
                      позиции должны быть заданы.
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onFillRankingTiersDescending()}
                      >
                        Заполнить n…1
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Для квиза эталон задаётся в колонке «Эталон (место)». Участник видит варианты в
                    текущем порядке, а баллы начисляются только при полном совпадении со скрытым
                    эталоном.
                  </Typography>
                )}
                {question.id ? null : (
                  <TextField
                    select
                    label="Проектор: метрика"
                    value={question.rankingProjectorMetric ?? "avg_score"}
                    onChange={(e) =>
                      onUpdateQuestion({
                        rankingProjectorMetric: e.target.value as
                          | "avg_rank"
                          | "avg_score"
                          | "total_score",
                      })
                    }
                    size="small"
                    sx={{ minWidth: 280 }}
                  >
                    <MenuItem value="avg_rank">Средний ранг</MenuItem>
                    <MenuItem value="avg_score">Средний балл (по варианту)</MenuItem>
                    <MenuItem value="total_score">Сумма баллов (по варианту)</MenuItem>
                  </TextField>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          pt: 1,
          justifyContent: "space-between",
          flexWrap: "nowrap",
          gap: 1,
        }}
      >
        <Button variant="outlined" color="error" onClick={onRequestRemove}>
          Удалить вопрос
        </Button>
        <Button variant="contained" onClick={() => void onSave()}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
