import CloseIcon from "@mui/icons-material/Close";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import {
  questionAllowsQuestionImage,
  type OptionForm,
  type QuestionForm,
} from "../../admin/adminEventForm";
import { BrandImageUploadTile } from "../../components/admin/branding/BrandImageUploadTile";
import { AdminEventQuestionDialogOptionsSection } from "./AdminEventQuestionDialogOptionsSection";

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
              {question.type === "tag_cloud" && (
                <TextField
                  size="small"
                  label="Подсказка игроку (облако тегов)"
                  value={question.tagCloudPlayerHint ?? ""}
                  onChange={(e) =>
                    onUpdateQuestion({
                      tagCloudPlayerHint: e.target.value,
                    })
                  }
                  helperText="Необязательно. Если пусто — подсказка на экране игрока не показывается."
                  placeholder="Например: До 3 тегов. Несколько слов через «;» в одном поле — один тег."
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

            <AdminEventQuestionDialogOptionsSection
              question={question}
              newOptionText={newOptionText}
              setNewOptionText={setNewOptionText}
              defaultRankingQuizHint={defaultRankingQuizHint}
              defaultRankingJuryHint={defaultRankingJuryHint}
              onDialogError={onDialogError}
              onUpdateQuestion={onUpdateQuestion}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
              onCommitNewOption={onCommitNewOption}
              onSetTagCloudTagPointsAt={onSetTagCloudTagPointsAt}
              onSetRankingTierAt={onSetRankingTierAt}
              onFillRankingTiersDescending={onFillRankingTiersDescending}
              uploadBannerMedia={uploadBannerMedia}
            />
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
