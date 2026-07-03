import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { BrandThemeId } from "@meyouquize/shared";
import { useMemo, useState } from "react";

export type EventThemeListOption = {
  id: string;
  name: string;
};

export type EventThemeSelection =
  | { kind: "preset"; theme: BrandThemeId }
  | { kind: "custom"; themeId: string; themeName: string };

type Props = {
  customThemes: EventThemeListOption[];
  themesLoading?: boolean;
  appliedEventThemeName?: string;
  onApply: (selection: EventThemeSelection) => void | Promise<void>;
};

function selectionLabel(selection: EventThemeSelection | null): string {
  if (!selection) return "";
  if (selection.kind === "preset") {
    return selection.theme === "meyou" ? "MeYOU" : "По умолчанию";
  }
  return selection.themeName;
}

export function EventThemeApplySection({
  customThemes,
  themesLoading = false,
  appliedEventThemeName,
  onApply,
}: Props) {
  const [selectedValue, setSelectedValue] = useState("default");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingSelection = useMemo((): EventThemeSelection | null => {
    if (selectedValue === "default" || selectedValue === "meyou") {
      return { kind: "preset", theme: selectedValue };
    }
    if (selectedValue.startsWith("custom:")) {
      const themeId = selectedValue.slice("custom:".length);
      const theme = customThemes.find((item) => item.id === themeId);
      if (!theme) return null;
      return { kind: "custom", themeId, themeName: theme.name };
    }
    return null;
  }, [customThemes, selectedValue]);

  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">Тема оформления</Typography>
      <FormControl size="small" fullWidth>
        <InputLabel id="event-theme-apply-label">Тема</InputLabel>
        <Select
          labelId="event-theme-apply-label"
          label="Тема"
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          disabled={themesLoading}
        >
          <MenuItem value="default">По умолчанию (встроенная)</MenuItem>
          <MenuItem value="meyou">MeYOU (встроенная)</MenuItem>
          {customThemes.map((theme) => (
            <MenuItem key={theme.id} value={`custom:${theme.id}`}>
              {theme.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        variant="outlined"
        size="small"
        disabled={!pendingSelection || themesLoading}
        onClick={() => setConfirmOpen(true)}
        sx={{ alignSelf: "flex-start" }}
      >
        Применить тему
      </Button>
      {appliedEventThemeName ? (
        <Typography variant="caption" color="text.secondary">
          Последняя применённая тема: {appliedEventThemeName}
        </Typography>
      ) : null}
      <Typography variant="caption" color="text.secondary">
        Применение заменит текущие настройки брендинга снимком выбранной темы. Дальнейшие правки
        глобальной темы ивент не затронут.
      </Typography>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Применить тему?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Тема «{selectionLabel(pendingSelection)}» заменит текущие настройки брендинга в этой
            комнате.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!pendingSelection) return;
              setConfirmOpen(false);
              await onApply(pendingSelection);
            }}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
