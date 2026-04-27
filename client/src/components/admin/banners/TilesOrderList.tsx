import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import type { BannerEditorState, BannerSize, OrderedTile } from "./types";

type Props = {
  tiles: OrderedTile[];
  editor: BannerEditorState;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleBannerVisible: (bannerId: string, next: boolean) => void;
  onDeleteBanner: (bannerId: string) => void;
  onStartEdit: (tile: Extract<OrderedTile, { kind: "banner" }>) => void;
  onCancelEdit: () => void;
  onSaveEdit: (bannerId: string) => void;
  onChangeEditLinkUrl: (value: string) => void;
  onChangeEditBackgroundUrl: (value: string) => void;
  onChangeEditSize: (value: BannerSize) => void;
};

export function TilesOrderList({
  tiles,
  editor,
  onMoveUp,
  onMoveDown,
  onToggleBannerVisible,
  onDeleteBanner,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onChangeEditLinkUrl,
  onChangeEditBackgroundUrl,
  onChangeEditSize,
}: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          component="details"
          sx={{
            "& > summary": {
              cursor: "pointer",
              listStyle: "none",
            },
            "& > summary::-webkit-details-marker": {
              display: "none",
            },
            "&[open] .tiles-summary-icon": {
              transform: "rotate(180deg)",
            },
          }}
        >
          <Box component="summary" sx={{ mb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" component="span">
                Плитки в порядке отображения
              </Typography>
              <KeyboardArrowDownIcon
                className="tiles-summary-icon"
                sx={{ color: "text.secondary", transition: "transform 160ms ease" }}
              />
            </Stack>
          </Box>
          <Stack spacing={1.5}>
            {tiles.map((tile, idx) => (
              <Stack
                key={tile.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
              >
                <Box
                  sx={
                    tile.kind === "speaker" || tile.kind === "program"
                      ? {
                          width: 200,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor:
                            tile.backgroundColor ||
                            (tile.kind === "speaker" ? "#1976d2" : "#6a1b9a"),
                          color: "#fff",
                          py: 1.5,
                          px: 1.5,
                          whiteSpace: "pre-line",
                          fontWeight: 700,
                          minHeight: 70,
                        }
                      : {
                          width: tile.size === "1x1" ? 100 : tile.size === "full" ? 320 : 200,
                          aspectRatio:
                            tile.size === "1x1"
                              ? "1 / 1"
                              : tile.size === "full"
                                ? "4 / 1"
                                : "2 / 1",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundImage: `url("${tile.previewUrl}")`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                  }
                >
                  {tile.kind === "speaker" ? tile.previewText.trim() || "Вопросы спикерам" : null}
                  {tile.kind === "program" ? tile.previewText.trim() || "Программа" : null}
                </Box>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2">{tile.label}</Typography>
                  {tile.kind === "banner" ? (
                    <Typography variant="caption" color="text.secondary">
                      Размер: {tile.size}
                    </Typography>
                  ) : null}
                  {tile.kind === "banner" ? (
                    <Typography variant="caption" color="text.secondary">
                      ID: {tile.banner.id}
                    </Typography>
                  ) : null}
                  {tile.kind === "banner" ? (
                    <Typography variant="body2" noWrap>
                      <Link
                        href={tile.banner.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        {tile.banner.linkUrl}
                      </Link>
                    </Typography>
                  ) : null}
                  {tile.kind === "program" ? (
                    <Typography variant="body2" noWrap>
                      <Link
                        href={tile.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        {tile.linkUrl || "ссылка не задана"}
                      </Link>
                    </Typography>
                  ) : null}
                  {tile.kind === "banner" && editor.editingId === tile.banner.id ? (
                    <Stack spacing={1}>
                      <TextField
                        size="small"
                        label="Ссылка"
                        value={editor.editLinkUrl}
                        onChange={(e) => onChangeEditLinkUrl(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        label="Картинка"
                        value={editor.editBackgroundUrl}
                        onChange={(e) => onChangeEditBackgroundUrl(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        select
                        size="small"
                        label="Размер"
                        value={editor.editSize}
                        onChange={(e) => onChangeEditSize(e.target.value as BannerSize)}
                        fullWidth
                      >
                        <MenuItem value="2x1">2x1</MenuItem>
                        <MenuItem value="1x1">1x1</MenuItem>
                        <MenuItem value="full">Во всю ширину</MenuItem>
                      </TextField>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => onSaveEdit(tile.banner.id)}
                          disabled={!editor.editLinkUrl.trim() || !editor.editBackgroundUrl.trim()}
                        >
                          Сохранить
                        </Button>
                        <Button size="small" variant="outlined" onClick={onCancelEdit}>
                          Отмена
                        </Button>
                      </Stack>
                    </Stack>
                  ) : null}
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" disabled={idx === 0} onClick={() => onMoveUp(tile.id)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={idx >= tiles.length - 1}
                      onClick={() => onMoveDown(tile.id)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    {tile.kind === "banner" ? (
                      <Button
                        size="small"
                        variant={tile.banner.isVisible ? "outlined" : "contained"}
                        onClick={() =>
                          onToggleBannerVisible(tile.banner.id, !tile.banner.isVisible)
                        }
                      >
                        {tile.banner.isVisible ? "Убрать с экрана" : "Вывести на экран"}
                      </Button>
                    ) : null}
                    {tile.kind === "banner" && editor.editingId !== tile.banner.id ? (
                      <Button size="small" variant="outlined" onClick={() => onStartEdit(tile)}>
                        Редактировать
                      </Button>
                    ) : null}
                    {tile.kind === "banner" ? (
                      <IconButton
                        size="small"
                        aria-label="Удалить баннер"
                        onClick={() => onDeleteBanner(tile.banner.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
