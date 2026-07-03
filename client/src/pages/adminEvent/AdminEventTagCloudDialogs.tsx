import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import { buildCloudWordsForDisplay } from "@meyouquize/shared";
import { VoteCountAdjustControls } from "../../components/admin/VoteCountAdjustControls";
import type { QuestionForm } from "../../admin/adminEventForm";
import type { QuestionResult } from "../../admin/adminEventTypes";

export type AdminEventTagCloudDialogsProps = {
  tagInputQuestionIndex: number | null;
  tagResultsQuestionIndex: number | null;
  questionForms: QuestionForm[];
  onQuestionFormsChange: Dispatch<SetStateAction<QuestionForm[]>>;
  questionResults: QuestionResult[];
  tagResultsOrder: string[];
  onCloseTagInput: () => void;
  onApplyInjectedTagList: () => void;
  onCloseTagResults: () => void;
  onToggleTagVisibility: (questionIndex: number, tagText: string) => void;
  onUpdateTagCountOverride: (questionIndex: number, tagText: string, nextCount: number) => void;
  onClearTagCountOverride: (questionIndex: number, tagText: string) => void;
};

export function AdminEventTagCloudDialogs({
  tagInputQuestionIndex,
  tagResultsQuestionIndex,
  questionForms,
  onQuestionFormsChange,
  questionResults,
  tagResultsOrder,
  onCloseTagInput,
  onApplyInjectedTagList,
  onCloseTagResults,
  onToggleTagVisibility,
  onUpdateTagCountOverride,
  onClearTagCountOverride,
}: AdminEventTagCloudDialogsProps) {
  return (
    <>
      <Dialog
        open={tagInputQuestionIndex !== null}
        onClose={onCloseTagInput}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить ответы списком</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Формат строк: <code>слово 10</code> или <code>слово: 10</code>
            </Typography>
            <TextField
              size="small"
              multiline
              minRows={6}
              maxRows={12}
              value={
                tagInputQuestionIndex !== null
                  ? (questionForms[tagInputQuestionIndex]?.injectedTagsInput ?? "")
                  : ""
              }
              onChange={(e) => {
                if (tagInputQuestionIndex === null) return;
                const value = e.target.value;
                onQuestionFormsChange((prev) =>
                  prev.map((q, idx) =>
                    idx === tagInputQuestionIndex ? { ...q, injectedTagsInput: value } : q,
                  ),
                );
              }}
              placeholder={"синий 10\nзеленый: 4\nкрасный (2)"}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseTagInput}>Отмена</Button>
          <Button variant="contained" onClick={onApplyInjectedTagList}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={tagResultsQuestionIndex !== null}
        onClose={onCloseTagResults}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Результаты облака тегов</DialogTitle>
        <DialogContent>
          <Stack spacing={0.5} sx={{ pt: 1 }}>
            {(() => {
              if (tagResultsQuestionIndex === null) return null;
              const question = questionForms[tagResultsQuestionIndex];
              if (!question) return null;
              const result = question.id
                ? questionResults.find((item) => item.questionId === question.id)
                : undefined;
              const tags = result?.tagCloud ?? [];
              const injected = question.injectedTagWords ?? [];
              const hiddenTags = question.hiddenTagTexts ?? [];
              const overrides = question.tagCountOverrides ?? [];
              const currentTags = buildCloudWordsForDisplay({
                liveTags: tags,
                hiddenTagTexts: hiddenTags,
                injectedTagWords: injected,
                tagCountOverrides: overrides,
              });
              const byText = new Map(currentTags.map((item) => [item.text, item]));
              const orderedTags = [
                ...tagResultsOrder
                  .map((text) => byText.get(text))
                  .filter((item): item is { text: string; count: number } => Boolean(item)),
                ...currentTags.filter((item) => !tagResultsOrder.includes(item.text)),
              ];
              if (orderedTags.length === 0) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    Пока нет ответов
                  </Typography>
                );
              }
              return orderedTags.map((tag) => (
                <Stack
                  key={`${question.id ?? tagResultsQuestionIndex}-${tag.text}`}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    variant="body2"
                    onClick={() => onToggleTagVisibility(tagResultsQuestionIndex, tag.text)}
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      cursor: "pointer",
                      textDecoration: hiddenTags.includes(tag.text) ? "line-through" : "none",
                      opacity: hiddenTags.includes(tag.text) ? 0.5 : 1,
                      pr: 1,
                      flex: 1,
                    }}
                  >
                    {tag.text}
                  </Typography>
                  <VoteCountAdjustControls
                    count={tag.count}
                    hasOverride={overrides.some((item) => item.text === tag.text)}
                    onDecrement={() =>
                      onUpdateTagCountOverride(tagResultsQuestionIndex, tag.text, tag.count - 1)
                    }
                    onIncrement={() =>
                      onUpdateTagCountOverride(tagResultsQuestionIndex, tag.text, tag.count + 1)
                    }
                    onRestore={() => onClearTagCountOverride(tagResultsQuestionIndex, tag.text)}
                  />
                </Stack>
              ));
            })()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseTagResults}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
