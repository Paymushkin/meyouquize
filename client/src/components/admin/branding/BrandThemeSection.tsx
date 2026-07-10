import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material";
import type { BrandThemeId } from "@meyouquize/shared";

type Props = {
  brandTheme: BrandThemeId;
  onThemeChange: (theme: BrandThemeId) => void;
};

export function BrandThemeSection({ brandTheme, onThemeChange }: Props) {
  return (
    <Stack spacing={0.5}>
      <FormControl size="small" fullWidth>
        <InputLabel id="brand-theme-label">Тема</InputLabel>
        <Select
          labelId="brand-theme-label"
          label="Тема"
          value={brandTheme}
          onChange={(e) => onThemeChange(e.target.value as BrandThemeId)}
          MenuProps={{ hideBackdrop: true }}
        >
          <MenuItem value="default">По умолчанию</MenuItem>
          <MenuItem value="meyou">MeYOU</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
