import AcUnitIcon from "@mui/icons-material/AcUnit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  type ProjectorTimelineMode,
  type ProjectorTimelineState,
  type ProjectorTimelineStep,
} from "@meyouquize/shared";

const MODE_OPTIONS: Array<{ value: ProjectorTimelineMode; label: string }> = [
  { value: "networking_profiles", label: "Профиль гостя" },
  { value: "networking_stats", label: "Статистика" },
  { value: "networking_incomplete", label: "Пустой профиль" },
  { value: "join_qr", label: "QR с текстом" },
  { value: "photo_wall", label: "Фотостена" },
  { value: "video_wall", label: "Видеостена" },
];

type Props = {
  timeline: ProjectorTimelineState;
  photoWallAvailable: boolean;
  videoWallAvailable: boolean;
  onAddStep: () => void;
  onUpdateStep: (stepId: string, patch: Partial<ProjectorTimelineStep>) => void;
  onRemoveStep: (stepId: string) => void;
  onMoveStep: (stepId: string, dir: -1 | 1) => void;
  onFreezeStep: (stepIndex: number) => void;
};

function modeOptionsForStep(
  stepMode: ProjectorTimelineMode,
  photoWallAvailable: boolean,
  videoWallAvailable: boolean,
): Array<{ value: ProjectorTimelineMode; label: string }> {
  return MODE_OPTIONS.filter((opt) => {
    if (opt.value === "photo_wall") return photoWallAvailable || stepMode === "photo_wall";
    if (opt.value === "video_wall") return videoWallAvailable || stepMode === "video_wall";
    return true;
  });
}

function timelineSelectMode(
  mode: ProjectorTimelineMode,
  options: Array<{ value: ProjectorTimelineMode }>,
): ProjectorTimelineMode {
  return options.some((opt) => opt.value === mode) ? mode : "networking_profiles";
}

export function AdminProjectorTimelineSection(props: Props) {
  const {
    timeline,
    photoWallAvailable,
    videoWallAvailable,
    onAddStep,
    onUpdateStep,
    onRemoveStep,
    onMoveStep,
    onFreezeStep,
  } = props;

  const [listManageEnabled, setListManageEnabled] = useState(false);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">Таймлайн проектора</Typography>
            <Tooltip title={listManageEnabled ? "Скрыть управление списком" : "Управление списком"}>
              <IconButton
                size="small"
                onClick={() => setListManageEnabled((v) => !v)}
                aria-label="Управление списком шагов таймлайна"
                aria-pressed={listManageEnabled}
                color={listManageEnabled ? "primary" : "default"}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {timeline.steps.map((step, index) => {
              const isFrozenHere = timeline.frozen && timeline.cursor === index;
              const isCurrent = timeline.cursor === index;
              const modeOptions = modeOptionsForStep(
                step.mode,
                photoWallAvailable,
                videoWallAvailable,
              );
              return (
                <Box
                  key={step.id}
                  sx={{
                    border: "1px solid",
                    borderColor: isFrozenHere
                      ? "info.main"
                      : isCurrent
                        ? "primary.main"
                        : "divider",
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      label="Режим"
                      value={timelineSelectMode(step.mode, modeOptions)}
                      onChange={(e) =>
                        onUpdateStep(step.id, { mode: e.target.value as ProjectorTimelineMode })
                      }
                      sx={{ minWidth: 220 }}
                    >
                      {modeOptions.map((opt) => (
                        <MenuItem
                          key={opt.value}
                          value={opt.value}
                          disabled={
                            (opt.value === "photo_wall" && !photoWallAvailable) ||
                            (opt.value === "video_wall" && !videoWallAvailable)
                          }
                        >
                          {opt.label}
                          {opt.value === "photo_wall" && !photoWallAvailable
                            ? " (нет фото)"
                            : opt.value === "video_wall" && !videoWallAvailable
                              ? " (нет видео)"
                              : ""}
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
                      sx={{ width: 120 }}
                      inputProps={{ min: 3, max: 600 }}
                    />
                    <IconButton
                      size="small"
                      color={isFrozenHere ? "info" : "default"}
                      aria-label={isFrozenHere ? "Снять фриз" : "Фриз"}
                      onClick={() => onFreezeStep(index)}
                      sx={{
                        flexShrink: 0,
                        ...(isFrozenHere
                          ? {
                              bgcolor: "info.main",
                              color: "info.contrastText",
                              "&:hover": { bgcolor: "info.dark" },
                            }
                          : {}),
                      }}
                    >
                      <AcUnitIcon fontSize="small" />
                    </IconButton>
                    {listManageEnabled ? (
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
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveStep(step.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Button sx={{ mt: 2 }} variant="outlined" onClick={onAddStep}>
            Добавить шаг
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
