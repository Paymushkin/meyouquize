import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { SpeakerQuestionsPayload } from "../../types/speakerQuestions";

const DEFAULT_SPEAKER_REACTIONS = ["👍", "🔥", "👏", "❤️"];

function speakerQuestionLabel(speakerName: string): string {
  return speakerName === "Все спикеры"
    ? "Вопрос ко всем спикерам"
    : `Вопрос к спикеру: ${speakerName}`;
}

const DIALOG_PAPER_SX = {
  bgcolor: "rgba(0, 0, 0, 0.9)",
  color: "#fff",
  backdropFilter: "blur(4px)",
} as const;

type Props = {
  open: boolean;
  speakerQuestions: SpeakerQuestionsPayload | null;
  speakerName: string;
  speakerQuestionText: string;
  onClose: () => void;
  onSpeakerNameChange: (next: string) => void;
  onSpeakerQuestionTextChange: (next: string) => void;
  onSubmit: () => void;
  onReact: (questionId: string, reaction: string) => void;
};

export function SpeakerQuestionsDialog({
  open,
  speakerQuestions,
  speakerName,
  speakerQuestionText,
  onClose,
  onSpeakerNameChange,
  onSpeakerQuestionTextChange,
  onSubmit,
  onReact,
}: Props) {
  const reactions = speakerQuestions?.settings.reactions ?? DEFAULT_SPEAKER_REACTIONS;
  const items = speakerQuestions?.items ?? [];
  const hasItems = items.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: DIALOG_PAPER_SX,
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 0.5,
          pb: 1,
          color: "#fff",
        }}
      >
        Вопросы спикерам
        <IconButton aria-label="Закрыть" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0.5, pb: 1.5, color: "#fff" }}>
        <Stack spacing={1} sx={{ pt: 0.5 }}>
          <TextField
            select
            label="Кому вопрос"
            size="small"
            value={speakerName}
            onChange={(e) => onSpeakerNameChange(e.target.value)}
          >
            <MenuItem value="Все спикеры">Все спикеры</MenuItem>
            {(speakerQuestions?.settings.speakers ?? []).map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Ваш вопрос"
            size="small"
            multiline
            minRows={2}
            maxRows={4}
            value={speakerQuestionText}
            onChange={(e) => onSpeakerQuestionTextChange(e.target.value)}
          />
          <Button variant="contained" onClick={onSubmit} disabled={!speakerQuestionText.trim()}>
            Отправить вопрос
          </Button>
          {hasItems ? (
            <>
              <Divider />
              <Typography variant="subtitle2">Актуальные вопросы</Typography>
              <Stack spacing={0.75}>
                {items.map((item, idx, arr) => (
                  <Stack key={item.id} spacing={1.5} sx={{ py: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      {speakerQuestionLabel(item.speakerName)}
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: "1rem", lineHeight: 1.4 }}>
                      {item.text}
                    </Typography>
                    {speakerQuestions?.settings.allowLikes ? (
                      <Stack direction="row" spacing={1}>
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
                    {idx < arr.length - 1 ? <Divider /> : null}
                  </Stack>
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
