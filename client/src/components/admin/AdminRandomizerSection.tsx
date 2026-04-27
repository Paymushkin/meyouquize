import CasinoIcon from "@mui/icons-material/Casino";
import SettingsIcon from "@mui/icons-material/Settings";
import RefreshIcon from "@mui/icons-material/Refresh";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type {
  RandomizerHistoryEntry,
  RandomizerListMode,
  RandomizerMode,
} from "../../features/randomizer/randomizerLogic";
import { useState } from "react";

type Props = {
  mode: RandomizerMode;
  listMode: RandomizerListMode;
  title: string;
  namesText: string;
  participantsNamesText: string;
  minNumber: number;
  maxNumber: number;
  winnersCount: number;
  excludeWinners: boolean;
  currentWinners: string[];
  history: RandomizerHistoryEntry[];
  projectorMode: boolean;
  isRunning: boolean;
  onModeChange: (value: RandomizerMode) => void;
  onListModeChange: (value: RandomizerListMode) => void;
  onTitleChange: (value: string) => void;
  onTitleCommit: () => void;
  onNamesTextChange: (value: string) => void;
  onMinNumberChange: (value: number) => void;
  onMaxNumberChange: (value: number) => void;
  onWinnersCountChange: (value: number) => void;
  onExcludeWinnersChange: (value: boolean) => void;
  onRun: () => void;
  onReset: () => void;
  onClearScreen: () => void;
  onToggleProjector: () => void;
};

export function AdminRandomizerSection(props: Props) {
  const {
    mode,
    listMode,
    title,
    namesText,
    participantsNamesText,
    minNumber,
    maxNumber,
    winnersCount,
    excludeWinners,
    currentWinners,
    history,
    projectorMode,
    isRunning,
    onModeChange,
    onListModeChange,
    onTitleChange,
    onTitleCommit,
    onNamesTextChange,
    onMinNumberChange,
    onMaxNumberChange,
    onWinnersCountChange,
    onExcludeWinnersChange,
    onRun,
    onReset,
    onClearScreen,
    onToggleProjector,
  } = props;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <TextField
              select
              size="small"
              label="Режим"
              value={mode}
              onChange={(e) => onModeChange(e.target.value as RandomizerMode)}
            >
              <MenuItem value="names">Выбор имен</MenuItem>
              <MenuItem value="numbers">Выбор чисел</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Заголовок на проекторе"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleCommit}
              inputProps={{ maxLength: 120 }}
            />
            {mode === "names" ? (
              <Stack spacing={1.25}>
                <TextField
                  select
                  size="small"
                  label="Список имен"
                  value={listMode}
                  onChange={(e) => onListModeChange(e.target.value as RandomizerListMode)}
                >
                  <MenuItem value="participants_only">Только участники</MenuItem>
                  <MenuItem value="free_list">Свободный список</MenuItem>
                </TextField>
                <TextField
                  multiline
                  rows={4}
                  size="small"
                  label="Список участников (по одному в строке)"
                  value={listMode === "participants_only" ? participantsNamesText : namesText}
                  onChange={(e) => onNamesTextChange(e.target.value)}
                  disabled={listMode === "participants_only"}
                  helperText={
                    listMode === "participants_only"
                      ? "Список формируется из вошедших в ивент"
                      : "Можно добавлять и удалять любых участников"
                  }
                  sx={{
                    "& .MuiInputBase-inputMultiline": {
                      resize: "vertical",
                      overflow: "auto !important",
                    },
                  }}
                />
              </Stack>
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  type="number"
                  size="small"
                  label="От"
                  value={minNumber}
                  onChange={(e) => onMinNumberChange(Number(e.target.value))}
                />
                <TextField
                  type="number"
                  size="small"
                  label="До"
                  value={maxNumber}
                  onChange={(e) => onMaxNumberChange(Number(e.target.value))}
                />
              </Stack>
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Tooltip title={projectorMode ? "Скрыть с экрана" : "Показать на экране"}>
                  <IconButton
                    color={projectorMode ? "primary" : "default"}
                    onClick={onToggleProjector}
                    aria-label={projectorMode ? "Скрыть с экрана" : "Показать на экране"}
                  >
                    {projectorMode ? <SlideshowIcon /> : <SlideshowOutlinedIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Выбрать победителей">
                  <IconButton
                    color={isRunning ? "primary" : "default"}
                    onClick={onRun}
                    aria-label="Выбрать победителей"
                  >
                    <CasinoIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Очистить данные на экране">
                  <IconButton
                    color="warning"
                    size="small"
                    onClick={onClearScreen}
                    aria-label="Очистить данные на экране"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={showAdvanced ? "Скрыть настройки" : "Скрытые настройки"}>
                <IconButton
                  size="small"
                  color={showAdvanced ? "primary" : "default"}
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  aria-label={showAdvanced ? "Скрыть настройки" : "Скрытые настройки"}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack spacing={1}>
              <Collapse in={showAdvanced} timeout="auto" unmountOnExit>
                <Stack spacing={1}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                      type="number"
                      size="small"
                      label="Количество победителей"
                      value={winnersCount}
                      onChange={(e) => onWinnersCountChange(Number(e.target.value))}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={excludeWinners}
                          onChange={(_, next) => onExcludeWinnersChange(next)}
                        />
                      }
                      label="Уникальные победители"
                    />
                  </Stack>
                </Stack>
              </Collapse>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Текущие победители
            </Typography>
            {currentWinners.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Пока пусто
              </Typography>
            ) : (
              <Stack spacing={0.75}>
                {currentWinners.map((winner, idx) => (
                  <Box
                    key={`${winner}_${idx}`}
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {winner}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              История
            </Typography>
            {history.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                История выборов пуста
              </Typography>
            ) : (
              <Stack spacing={0.75} sx={{ maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
                {history.map((entry, idx) => (
                  <Box
                    key={`${entry.timestamp}_${idx}`}
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {entry.timestamp}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {entry.winners.join(", ")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
      <Stack>
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={() => {
            if (!window.confirm("Сбросить историю и список выбранных победителей?")) return;
            onReset();
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          сбросить историю
        </Button>
      </Stack>
    </Stack>
  );
}
