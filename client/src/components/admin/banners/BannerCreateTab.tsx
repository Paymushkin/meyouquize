import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

export type PlayerTilesGridColumns = 2 | 3;

type Props = {
  linkUrl: string;
  backgroundUrl: string;
  visualStyle: "image" | "tile";
  tileText: string;
  tileBackgroundColor: string;
  tileTextColor: string;
  gridColumns: PlayerTilesGridColumns;
  uploading: boolean;
  onChangeLinkUrl: (value: string) => void;
  onChangeBackgroundUrl: (value: string) => void;
  onChangeVisualStyle: (value: "image" | "tile") => void;
  onChangeTileText: (value: string) => void;
  onChangeTileBackgroundColor: (value: string) => void;
  onChangeTileTextColor: (value: string) => void;
  onChangeGridColumns: (value: PlayerTilesGridColumns) => void;
  onUpload: (file: File) => Promise<void>;
  onCreate: () => void;
};

export function BannerCreateTab({
  linkUrl,
  backgroundUrl,
  visualStyle,
  tileText,
  tileBackgroundColor,
  tileTextColor,
  gridColumns,
  uploading,
  onChangeLinkUrl,
  onChangeBackgroundUrl,
  onChangeVisualStyle,
  onChangeTileText,
  onChangeTileBackgroundColor,
  onChangeTileTextColor,
  onChangeGridColumns,
  onUpload,
  onCreate,
}: Props) {
  const isTile = visualStyle === "tile";
  const createDisabled =
    linkUrl.trim().length === 0 ||
    (isTile ? tileText.trim().length === 0 : backgroundUrl.trim().length === 0);
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Создать баннер</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={isTile}
            onChange={(_, checked) => onChangeVisualStyle(checked ? "tile" : "image")}
          />
        }
        label="Визуал как у плитки спикеров (цвет + текст)"
      />
      <TextField
        label="Ссылка баннера"
        size="small"
        value={linkUrl}
        onChange={(e) => onChangeLinkUrl(e.target.value)}
        placeholder="https://example.com или email@example.com"
        fullWidth
      />
      {isTile ? (
        <>
          <TextField
            label="Текст баннера"
            size="small"
            value={tileText}
            onChange={(e) => onChangeTileText(e.target.value)}
            placeholder="Текст на плитке"
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
          />
          <TextField
            label="Фоновый цвет"
            size="small"
            value={tileBackgroundColor}
            onChange={(e) => onChangeTileBackgroundColor(e.target.value)}
            placeholder="#1976d2"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <Box
                    component="input"
                    type="color"
                    aria-label="Выбрать фоновый цвет баннера"
                    value={tileBackgroundColor || "#1976d2"}
                    onChange={(e) => onChangeTileBackgroundColor(e.target.value)}
                    sx={{
                      width: 28,
                      height: 28,
                      p: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  />
                ),
              },
            }}
          />
          <TextField
            label="Цвет текста"
            size="small"
            value={tileTextColor}
            onChange={(e) => onChangeTileTextColor(e.target.value)}
            placeholder="#ffffff"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <Box
                    component="input"
                    type="color"
                    aria-label="Выбрать цвет текста баннера"
                    value={tileTextColor || "#ffffff"}
                    onChange={(e) => onChangeTileTextColor(e.target.value)}
                    sx={{
                      width: 28,
                      height: 28,
                      p: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  />
                ),
              },
            }}
          />
        </>
      ) : (
        <TextField
          label="Фоновая картинка баннера"
          size="small"
          value={backgroundUrl}
          onChange={(e) => onChangeBackgroundUrl(e.target.value)}
          placeholder="https://example.com/banner.png"
          fullWidth
        />
      )}
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
        {!isTile ? (
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
        ) : null}
        <Button
          variant="contained"
          disabled={createDisabled || uploading}
          onClick={onCreate}
          sx={{ flex: 1, minHeight: 40, whiteSpace: "nowrap" }}
        >
          Создать новый баннер
        </Button>
      </Stack>
      {isTile && tileText.trim() ? (
        <Box
          sx={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: tileBackgroundColor || "#1976d2",
            color: tileTextColor || "#fff",
            py: 1.5,
            px: 2,
            whiteSpace: "pre-line",
            fontWeight: 700,
            minHeight: 70,
          }}
        >
          {tileText}
        </Box>
      ) : null}
      {!isTile && backgroundUrl.trim() ? (
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
