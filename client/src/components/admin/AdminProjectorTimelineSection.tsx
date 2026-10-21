import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StopIcon from "@mui/icons-material/Stop";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type {
  ProjectorTimelineMode,
  ProjectorTimelineState,
  ProjectorTimelineStep,
} from "@meyouquize/shared";

const MODE_OPTIONS: Array<{ value: ProjectorTimelineMode; label: string }> = [
  { value: "title", label: "Титул" },
  { value: "question", label: "Вопрос" },
  { value: "leaderboard", label: "Лидерборд" },
  { value: "speaker_questions", label: "Q&A" },
  { value: "reactions", label: "Реакции" },
  { value: "randomizer", label: "Рандомайзер" },
  { value: "photo_wall", label: "Фотостена" },
  { value: "video_wall", label: "Видеостена" },
  { value: "debate_compare", label: "Дебаты (сравнение)" },
  { value: "debate_series", label: "Дебаты (серия)" },
];

export type TimelineQuestionOption = { id: string; label: string };
export type TimelineSubQuizOption = { id: string; label: string };

type Props = {
  timeline: ProjectorTimelineState;
  networkingEnabled: boolean;
  onNetworkingEnabledChange: (enabled: boolean) => void;
  questions: TimelineQuestionOption[];
  subQuizzes: TimelineSubQuizOption[];
  onAddStep: () => void;
  onUpdateStep: (stepId: string, patch: Partial<ProjectorTimelineStep>) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, dir: -1 | 1) => void;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onStop: () => void;
};

export function AdminProjectorTimelineSection(props: Props) {
  const {
    timeline,
    networkingEnabled,
    onNetworkingEnabledChange,
    questions,
    subQuizzes,
    onAddStep,
    onUpdateStep,
    onRemoveStep,
    onMoveStep,
    onPlay,
    onPause,
    onSkip,
    onStop,
  } = props;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Нетворкинг
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Модуль гостей и личных чатов внутри этого ивента. По умолчанию выключен.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={networkingEnabled}
                onChange={(e) => onNetworkingEnabledChange(e.target.checked)}
              />
            }
            label={networkingEnabled ? "Включён" : "Выключен"}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Таймлайн проектора
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Плейлист режимов крутится на сервере — админку можно закрыть. Ручная смена режима на
            проекторе ставит плейлист на паузу.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={onPlay}
              disabled={timeline.steps.length === 0}
            >
              Play
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PauseIcon />}
              onClick={onPause}
              disabled={!timeline.playing}
            >
              Pause
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SkipNextIcon />}
              onClick={onSkip}
              disabled={timeline.steps.length === 0}
            >
              Next
            </Button>
            <Button size="small" variant="outlined" startIcon={<StopIcon />} onClick={onStop}>
              Stop
            </Button>
            <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {timeline.playing
                  ? `Играет · шаг ${timeline.cursor + 1}/${timeline.steps.length}`
                  : timeline.steps.length
                    ? `Пауза · ${timeline.steps.length} шагов`
                    : "Нет шагов"}
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={1.5}>
            {timeline.steps.map((step, index) => (
              <Box
                key={step.id}
                sx={{
                  border: "1px solid",
                  borderColor: timeline.cursor === index ? "primary.main" : "divider",
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                  <TextField
                    select
                    size="small"
                    label="Режим"
                    value={step.mode}
                    onChange={(e) =>
                      onUpdateStep(step.id, { mode: e.target.value as ProjectorTimelineMode })
                    }
                    sx={{ minWidth: 160 }}
                  >
                    {MODE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    type="number"
                    label="Сек"
                    value={step.durationSec}
                    onChange={(e) =>
                      onUpdateStep(step.id, {
                        durationSec: Math.max(3, Math.min(600, Number(e.target.value) || 10)),
                      })
                    }
                    sx={{ width: 100 }}
                    inputProps={{ min: 3, max: 600 }}
                  />
                  {(step.mode === "question" || step.mode === "debate_compare") && (
                    <TextField
                      select
                      size="small"
                      label="Вопрос"
                      value={step.questionId ?? ""}
                      onChange={(e) =>
                        onUpdateStep(step.id, { questionId: e.target.value || undefined })
                      }
                      sx={{ minWidth: 200, flex: 1 }}
                    >
                      <MenuItem value="">—</MenuItem>
                      {questions.map((q) => (
                        <MenuItem key={q.id} value={q.id}>
                          {q.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {step.mode === "leaderboard" && (
                    <TextField
                      select
                      size="small"
                      label="Сабквиз"
                      value={step.leaderboardSubQuizId ?? ""}
                      onChange={(e) =>
                        onUpdateStep(step.id, {
                          leaderboardSubQuizId: e.target.value || undefined,
                        })
                      }
                      sx={{ minWidth: 180, flex: 1 }}
                    >
                      <MenuItem value="">Комната</MenuItem>
                      {subQuizzes.map((sq) => (
                        <MenuItem key={sq.id} value={sq.id}>
                          {sq.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {step.mode === "debate_series" && (
                    <TextField
                      size="small"
                      label="ID серии"
                      value={step.debateSeriesId ?? ""}
                      onChange={(e) =>
                        onUpdateStep(step.id, {
                          debateSeriesId: e.target.value.trim() || undefined,
                        })
                      }
                      sx={{ minWidth: 160, flex: 1 }}
                    />
                  )}
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => onMoveStep(step.id, -1)}
                      disabled={index === 0}
                    >
                      <KeyboardArrowUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onMoveStep(step.id, 1)}
                      disabled={index === timeline.steps.length - 1}
                    >
                      <KeyboardArrowDownIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onRemoveStep(step.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>

          <Button sx={{ mt: 2 }} variant="outlined" onClick={onAddStep}>
            Добавить шаг
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
