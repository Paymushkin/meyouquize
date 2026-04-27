import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { BannerSize } from "./types";

type Props = {
  linkUrl: string;
  backgroundUrl: string;
  size: BannerSize;
  uploading: boolean;
  onChangeLinkUrl: (value: string) => void;
  onChangeBackgroundUrl: (value: string) => void;
  onChangeSize: (value: BannerSize) => void;
  onUpload: (file: File) => Promise<void>;
  onCreate: () => void;
};

export function BannerCreateTab({
  linkUrl,
  backgroundUrl,
  size,
  uploading,
  onChangeLinkUrl,
  onChangeBackgroundUrl,
  onChangeSize,
  onUpload,
  onCreate,
}: Props) {
  const createDisabled = linkUrl.trim().length === 0 || backgroundUrl.trim().length === 0;
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Создать баннер</Typography>
      <TextField
        label="Ссылка баннера"
        size="small"
        value={linkUrl}
        onChange={(e) => onChangeLinkUrl(e.target.value)}
        placeholder="https://example.com"
        fullWidth
      />
      <TextField
        label="Фоновая картинка баннера"
        size="small"
        value={backgroundUrl}
        onChange={(e) => onChangeBackgroundUrl(e.target.value)}
        placeholder="https://example.com/banner.png"
        fullWidth
      />
      <TextField
        select
        label="Размер плитки"
        size="small"
        value={size}
        onChange={(e) => onChangeSize(e.target.value as BannerSize)}
        fullWidth
      >
        <MenuItem value="2x1">2x1</MenuItem>
        <MenuItem value="1x1">1x1</MenuItem>
        <MenuItem value="full">Во всю ширину</MenuItem>
      </TextField>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: "stretch" }}>
        <Button
          component="label"
          variant="outlined"
          disabled={uploading}
          sx={{ flex: 1, minHeight: 40, whiteSpace: "nowrap" }}
        >
          {uploading ? "Загрузка..." : "Загрузить картинку"}
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = e.target.files?.[0];
              if (!file) return;
              await onUpload(file);
              input.value = "";
            }}
          />
        </Button>
        <Button
          variant="contained"
          disabled={createDisabled || uploading}
          onClick={onCreate}
          sx={{ flex: 1, minHeight: 40, whiteSpace: "nowrap" }}
        >
          Создать новый баннер
        </Button>
      </Stack>
      {backgroundUrl.trim() ? (
        <Box
          sx={{
            width: size === "1x1" ? "100px" : size === "full" ? "320px" : "200px",
            maxWidth: "100%",
            aspectRatio: size === "1x1" ? "1 / 1" : size === "full" ? "4 / 1" : "2 / 1",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            backgroundImage: `url("${backgroundUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : null}
    </Stack>
  );
}
