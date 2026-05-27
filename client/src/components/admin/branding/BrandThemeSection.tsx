import { FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { BrandThemeId } from "@meyouquize/shared";

type Props = {
  brandTheme: BrandThemeId;
  onThemeChange: (theme: BrandThemeId) => void;
};

export function BrandThemeSection({ brandTheme, onThemeChange }: Props) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">Тема оформления</Typography>
      <FormControl size="small" fullWidth>
        <InputLabel id="brand-theme-label">Тема</InputLabel>
        <Select
          labelId="brand-theme-label"
          label="Тема"
          value={brandTheme}
          onChange={(e) => onThemeChange(e.target.value as BrandThemeId)}
        >
          <MenuItem value="default">По умолчанию</MenuItem>
          <MenuItem value="meyou">MeYOU</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary">
        Меняет цвета, шрифты и фоновые изображения. Баннеры, вопросы и контент плиток не
        затрагиваются.
      </Typography>
    </Stack>
  );
}
