import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";

export type PlayerTilesGridColumns = 2 | 3;

type Props = {
  linkUrl: string;
  backgroundUrl: string;
  gridColumns: PlayerTilesGridColumns;
  uploading: boolean;
  onChangeLinkUrl: (value: string) => void;
  onChangeBackgroundUrl: (value: string) => void;
  onChangeGridColumns: (value: PlayerTilesGridColumns) => void;
  onUpload: (file: File) => Promise<void>;
  onCreate: () => void;
};

export function BannerCreateTab({
  linkUrl,
  backgroundUrl,
  gridColumns,
  uploading,
  onChangeLinkUrl,
  onChangeBackgroundUrl,
  onChangeGridColumns,
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
        placeholder="https://example.com или email@example.com"
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
        label="Формат сетки"
        size="small"
        value={gridColumns}
        onChange={(e) => onChangeGridColumns(Number(e.target.value) as PlayerTilesGridColumns)}
        fullWidth
        helperText="Сколько колонок плиток показывать игроку"
      >
        <MenuItem value={2}>2 колонки</MenuItem>
        <MenuItem value={3}>3 колонки</MenuItem>
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
            width: 100,
            height: 100,
            maxWidth: "100%",
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
