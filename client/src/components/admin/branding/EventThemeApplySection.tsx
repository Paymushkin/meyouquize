import { FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
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
  appliedEventThemeKey?: string;
  brandTheme?: BrandThemeId;
  onApply: (selection: EventThemeSelection) => void | Promise<void>;
};

export function eventThemeSelectionToKey(selection: EventThemeSelection): string {
  return selection.kind === "preset" ? selection.theme : `custom:${selection.themeId}`;
}

export function appliedEventThemeNameToSelectValue(
  appliedEventThemeName: string | undefined,
  customThemes: EventThemeListOption[],
  brandThemeFallback: BrandThemeId = "default",
): string {
  const name = appliedEventThemeName?.trim();
  if (name) {
    if (name === "MeYOU") return "meyou";
    if (name === "По умолчанию") return "default";
    const custom = customThemes.find((theme) => theme.name === name);
    if (custom) return `custom:${custom.id}`;
  }
  return brandThemeFallback === "meyou" ? "meyou" : "default";
}

export function resolveEventThemeSelectValue(
  appliedEventThemeKey: string | undefined,
  appliedEventThemeName: string | undefined,
  customThemes: EventThemeListOption[],
  brandThemeFallback: BrandThemeId = "default",
): string {
  const key = appliedEventThemeKey?.trim();
  if (key === "default" || key === "meyou") return key;
  if (key?.startsWith("custom:")) return key;
  return appliedEventThemeNameToSelectValue(
    appliedEventThemeName,
    customThemes,
    brandThemeFallback,
  );
}

function resolveSelection(
  value: string,
  customThemes: EventThemeListOption[],
): EventThemeSelection | null {
  if (value === "default" || value === "meyou") {
    return { kind: "preset", theme: value };
  }
  if (value.startsWith("custom:")) {
    const themeId = value.slice("custom:".length);
    const theme = customThemes.find((item) => item.id === themeId);
    if (!theme) return null;
    return { kind: "custom", themeId, themeName: theme.name };
  }
  return null;
}

export function EventThemeApplySection({
  customThemes,
  themesLoading = false,
  appliedEventThemeName,
  appliedEventThemeKey,
  brandTheme = "default",
  onApply,
}: Props) {
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const resolvedValue = useMemo(
    () =>
      resolveEventThemeSelectValue(
        appliedEventThemeKey,
        appliedEventThemeName,
        customThemes,
        brandTheme,
      ),
    [appliedEventThemeKey, appliedEventThemeName, brandTheme, customThemes],
  );
  const selectedValue = pendingValue ?? resolvedValue;
  const staleCustomTheme =
    selectedValue.startsWith("custom:") &&
    !customThemes.some((theme) => selectedValue === `custom:${theme.id}`);

  async function handleSelectChange(nextValue: string) {
    if (nextValue === resolvedValue) return;
    setPendingValue(nextValue);
    const selection = resolveSelection(nextValue, customThemes);
    if (!selection) {
      setPendingValue(null);
      return;
    }
    setApplying(true);
    try {
      await onApply(selection);
    } finally {
      setPendingValue(null);
      setApplying(false);
    }
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">Тема оформления</Typography>
      <FormControl size="small" fullWidth>
        <InputLabel id="event-theme-apply-label">Тема</InputLabel>
        <Select
          labelId="event-theme-apply-label"
          label="Тема"
          value={selectedValue}
          onChange={(e) => void handleSelectChange(e.target.value)}
          disabled={themesLoading || applying}
        >
          <MenuItem value="default">По умолчанию (встроенная)</MenuItem>
          <MenuItem value="meyou">MeYOU (встроенная)</MenuItem>
          {staleCustomTheme ? (
            <MenuItem value={selectedValue}>
              {appliedEventThemeName?.trim() || "Применённая тема"}
            </MenuItem>
          ) : null}
          {customThemes.map((theme) => (
            <MenuItem key={theme.id} value={`custom:${theme.id}`}>
              {theme.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {appliedEventThemeName ? (
        <Typography variant="caption" color="text.secondary">
          Последняя применённая тема: {appliedEventThemeName}
        </Typography>
      ) : null}
    </Stack>
  );
}
