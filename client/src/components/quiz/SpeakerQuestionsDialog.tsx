import { useEffect, useMemo, useState } from "react";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SpeakerQuestionItem, SpeakerQuestionsPayload } from "../../types/speakerQuestions";
import {
  filterActualSpeakerQuestions,
  filterMySpeakerQuestions,
} from "../../features/speakerQuestions/playerSpeakerQuestionsLists";
import {
  SPEAKER_ALL_TARGET_LABEL,
  SPEAKER_SELECT_PLACEHOLDER_LABEL,
  SPEAKER_UI_UNSELECTED,
  normalizeSpeakerUiSelection,
  speakerQuestionRecipientLabelForAudience,
} from "../../features/speakerQuestions/speakerTargetUi";
import { SPEAKER_ALL_TARGET } from "@meyouquize/shared";
import { buildBrandPrimaryContainedButtonSx } from "../../pages/quiz-play/QuizPlayBrandingBlocks";
import {
  PLAYER_DIALOG_CONTENT_SX,
  PLAYER_DIALOG_TITLE_SX,
  buildPlayerDialogPaperSx,
  buildPlayerDialogFieldLabelSx,
  buildPlayerDialogSelectMenuProps,
  buildPlayerDialogTabsSx,
  buildPlayerDialogTextFieldSx,
} from "./playerDialogStyles";

const DEFAULT_SPEAKER_REACTIONS = ["👍", "🔥", "👏", "❤️"];

type QuestionsTab = "actual" | "mine";

function SpeakerQuestionRow(props: {
  item: SpeakerQuestionItem;
  reactions: string[];
  showReactions: boolean;
  showDelete: boolean;
  onReact: (questionId: string, reaction: string) => void;
  onDelete: (questionId: string) => void;
}) {
  const { item, reactions, showReactions, showDelete, onReact, onDelete } = props;
  const recipientLabel = speakerQuestionRecipientLabelForAudience(item.speakerName);

  return (
    <Stack spacing={1.5} sx={{ py: 0.25 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        {recipientLabel ? (
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {recipientLabel}
          </Typography>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        {showDelete ? (
          <IconButton
            size="small"
            aria-label="Удалить вопрос"
            onClick={() => onDelete(item.id)}
            sx={{ color: alpha("#fff", 0.72), mt: -0.5 }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      <Typography variant="body1" sx={{ fontSize: "1rem", lineHeight: 1.4 }}>
        {item.text}
      </Typography>
      {showReactions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {reactions.map((reaction) => {
            const isSelected = (item.myReactions ?? []).includes(reaction);
            const count = item.reactionCounts?.[reaction] ?? 0;
            return (
              <Chip
                key={`${item.id}_${reaction}`}
                size="small"
                clickable
                variant="filled"
                label={count > 0 ? `${reaction} ${count}` : reaction}
                onClick={() => onReact(item.id, reaction)}
                sx={{
                  bgcolor: "transparent",
                  color: "#fff",
                  border: isSelected ? "1px solid rgba(255,255,255,0.95)" : "none",
                }}
              />
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}

type Props = {
  open: boolean;
  speakerQuestions: SpeakerQuestionsPayload | null;
  speakerName: string;
  speakerQuestionText: string;
  formBackgroundColor: string;
  formTextColor: string;
  formInputTextColor: string;
  brandFontFamily: string;
  onClose: () => void;
  onSpeakerNameChange: (next: string) => void;
  onSpeakerQuestionTextChange: (next: string) => void;
  onSubmit: () => void;
  onReact: (questionId: string, reaction: string) => void;
  onDelete: (questionId: string) => void;
};

export function SpeakerQuestionsDialog({
  open,
  speakerQuestions,
  speakerName,
  speakerQuestionText,
  formBackgroundColor,
  formTextColor,
  formInputTextColor,
  brandFontFamily,
  onClose,
  onSpeakerNameChange,
  onSpeakerQuestionTextChange,
  onSubmit,
  onReact,
  onDelete,
}: Props) {
  const reactions = speakerQuestions?.settings.reactions ?? DEFAULT_SPEAKER_REACTIONS;
  const speakers = speakerQuestions?.settings.speakers ?? [];
  const allowAllSpeakersTarget = speakerQuestions?.settings.allowAllSpeakersTarget !== false;
  const selectValue = normalizeSpeakerUiSelection(speakerName, allowAllSpeakersTarget, speakers);
  const actualItems = useMemo(
    () => filterActualSpeakerQuestions(speakerQuestions?.items ?? []),
    [speakerQuestions?.items],
  );
  const mineItems = useMemo(
    () => filterMySpeakerQuestions(speakerQuestions?.items ?? []),
    [speakerQuestions?.items],
  );
  const showMineTab = mineItems.length > 0;
  const showQuestionsSection = actualItems.length > 0 || mineItems.length > 0;
  const [tab, setTab] = useState<QuestionsTab>("actual");
  const textFieldSx = buildPlayerDialogTextFieldSx(
    formBackgroundColor,
    formInputTextColor,
    brandFontFamily,
  );
  const fieldLabelSx = buildPlayerDialogFieldLabelSx(formInputTextColor, brandFontFamily);
  const selectMenuProps = buildPlayerDialogSelectMenuProps(
    brandFontFamily,
    formBackgroundColor,
    formTextColor,
  );

  useEffect(() => {
    if (!open) return;
    const next = normalizeSpeakerUiSelection(speakerName, allowAllSpeakersTarget, speakers);
    if (next !== speakerName) {
      onSpeakerNameChange(next);
    }
  }, [open, allowAllSpeakersTarget, onSpeakerNameChange, speakerName, speakers]);

  useEffect(() => {
    if (!open) return;
    if (actualItems.length > 0) {
      setTab("actual");
      return;
    }
    if (mineItems.length > 0) setTab("mine");
  }, [open, actualItems.length, mineItems.length]);

  useEffect(() => {
    if (!showMineTab && tab === "mine") setTab("actual");
  }, [showMineTab, tab]);

  const visibleItems = tab === "mine" ? mineItems : actualItems;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: buildPlayerDialogPaperSx(brandFontFamily),
      }}
    >
      <DialogTitle sx={PLAYER_DIALOG_TITLE_SX}>
        Вопросы спикерам
        <IconButton aria-label="Закрыть" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={PLAYER_DIALOG_CONTENT_SX}>
        <Stack spacing={1.5}>
          <Stack spacing={0.75}>
            <Typography component="label" sx={fieldLabelSx}>
              Кому вопрос
            </Typography>
            <TextField
              select
              hiddenLabel
              size="small"
              value={selectValue}
              onChange={(e) => onSpeakerNameChange(e.target.value)}
              sx={textFieldSx}
              slotProps={{
                select: {
                  displayEmpty: !allowAllSpeakersTarget,
                  renderValue: (selected) => {
                    const value = String(selected ?? "");
                    if (!allowAllSpeakersTarget && value === SPEAKER_UI_UNSELECTED) {
                      return SPEAKER_SELECT_PLACEHOLDER_LABEL;
                    }
                    if (value === SPEAKER_ALL_TARGET) return SPEAKER_ALL_TARGET_LABEL;
                    return value;
                  },
                  MenuProps: selectMenuProps,
                },
              }}
            >
              {allowAllSpeakersTarget ? (
                <MenuItem value={SPEAKER_ALL_TARGET}>{SPEAKER_ALL_TARGET_LABEL}</MenuItem>
              ) : (
                <MenuItem value={SPEAKER_UI_UNSELECTED}>
                  {SPEAKER_SELECT_PLACEHOLDER_LABEL}
                </MenuItem>
              )}
              {speakers.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack spacing={0.75}>
            <Typography component="label" sx={fieldLabelSx}>
              Ваш вопрос
            </Typography>
            <TextField
              hiddenLabel
              size="small"
              multiline
              minRows={2}
              maxRows={4}
              value={speakerQuestionText}
              onChange={(e) => onSpeakerQuestionTextChange(e.target.value)}
              sx={textFieldSx}
            />
          </Stack>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!speakerQuestionText.trim()}
            sx={buildBrandPrimaryContainedButtonSx(formBackgroundColor, formTextColor)}
          >
            Отправить вопрос
          </Button>
          {showQuestionsSection ? (
            <>
              <Divider />
              {showMineTab ? (
                <Tabs
                  value={tab}
                  onChange={(_, next: QuestionsTab) => setTab(next)}
                  variant="fullWidth"
                  sx={buildPlayerDialogTabsSx(formBackgroundColor, brandFontFamily)}
                >
                  <Tab value="actual" label="Актуальные вопросы" />
                  <Tab value="mine" label="Мои вопросы" />
                </Tabs>
              ) : (
                <Typography variant="subtitle2" sx={{ color: formBackgroundColor }}>
                  Актуальные вопросы
                </Typography>
              )}
              <Stack spacing={0.75}>
                {visibleItems.length === 0 ? (
                  <Typography variant="body2" sx={{ color: alpha("#fff", 0.65), py: 0.5 }}>
                    {tab === "actual"
                      ? "Пока нет одобренных вопросов."
                      : "У вас пока нет вопросов."}
                  </Typography>
                ) : (
                  visibleItems.map((item, idx, arr) => (
                    <Box key={item.id}>
                      <SpeakerQuestionRow
                        item={item}
                        reactions={reactions}
                        showReactions={tab === "actual"}
                        showDelete={tab === "mine" && Boolean(item.isMine)}
                        onReact={onReact}
                        onDelete={onDelete}
                      />
                      {idx < arr.length - 1 ? <Divider sx={{ mt: 1.5 }} /> : null}
                    </Box>
                  ))
                )}
              </Stack>
            </>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
