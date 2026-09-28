import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { sanitizeBannerLinkUrl } from "../../../utils/safeUrls";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import EventNoteIcon from "@mui/icons-material/EventNote";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { isQuizResultsTileId } from "../../../publicViewContract";
import { PlayerPhotoWallCollageTile } from "../../quiz/PlayerPhotoWallCollageTile";
import { PlayerQuizResultsTile } from "../../quiz/PlayerQuizResultsTile";
import type { BannerEditorState, OrderedTile } from "./types";

const PREVIEW_TILE_SIZE = 100;

type Props = {
  tiles: OrderedTile[];
  bannerClickCounts: Record<string, number>;
  editor: BannerEditorState;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleBannerVisible: (bannerId: string, next: boolean) => void;
  photoWallTileVisible: boolean;
  onTogglePhotoWallTileVisible: (next: boolean) => void;
  onDeleteBanner: (bannerId: string) => void;
  onStartEdit: (tile: Extract<OrderedTile, { kind: "banner" }>) => void;
  onCancelEdit: () => void;
  onSaveEdit: (bannerId: string) => void;
  onChangeEditLinkUrl: (value: string) => void;
  onChangeEditBackgroundUrl: (value: string) => void;
};

export function TilesOrderList({
  tiles,
  bannerClickCounts,
  editor,
  onMoveUp,
  onMoveDown,
  onToggleBannerVisible,
  photoWallTileVisible,
  onTogglePhotoWallTileVisible,
  onDeleteBanner,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onChangeEditLinkUrl,
  onChangeEditBackgroundUrl,
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
                          flexShrink: 0,
                          alignSelf: "flex-start",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor:
                            tile.backgroundColor ||
                            (tile.kind === "speaker" ? "#1976d2" : "#6a1b9a"),
                          color: tile.textColor || "#fff",
                          py: 1.5,
                          px: 2,
                          whiteSpace: "pre-line",
                          fontWeight: 700,
                          minHeight: 70,
                          position: "relative",
                        }
                      : tile.kind === "quiz_results" || tile.kind === "photo_wall"
                        ? {
                            width: PREVIEW_TILE_SIZE,
                            height: PREVIEW_TILE_SIZE,
                            flexShrink: 0,
                            alignSelf: "flex-start",
                            boxSizing: "border-box",
                          }
                        : {
                            width: PREVIEW_TILE_SIZE,
                            height: PREVIEW_TILE_SIZE,
                            flexShrink: 0,
                            alignSelf: "flex-start",
                            boxSizing: "border-box",
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
                  {tile.kind === "speaker" ? (
                    <>
                      <QuestionAnswerIcon
                        sx={{
                          position: "absolute",
                          right: 8,
                          bottom: 8,
                          width: 18,
                          height: 18,
                          p: 0.8,
                          borderRadius: "50%",
                          bgcolor: "transparent",
                          border: `1px solid ${tile.textColor || "#fff"}`,
                          color: tile.textColor || "#fff",
                          boxSizing: "content-box",
                        }}
                        aria-hidden
                      />
                      {tile.previewText.trim() || "Вопросы спикерам"}
                    </>
                  ) : null}
                  {tile.kind === "program" ? (
                    <>
                      <EventNoteIcon
                        sx={{
                          position: "absolute",
                          right: 8,
                          bottom: 8,
                          width: 18,
                          height: 18,
                          p: 0.8,
                          borderRadius: "50%",
                          bgcolor: "transparent",
                          border: `1px solid ${tile.textColor || "#fff"}`,
                          color: tile.textColor || "#fff",
                          boxSizing: "content-box",
                        }}
                        aria-hidden
                      />
                      {tile.previewText.trim() || "Программа"}
                    </>
                  ) : null}
                  {tile.kind === "quiz_results" ? (
                    <PlayerQuizResultsTile
                      preview
                      previewWidth={PREVIEW_TILE_SIZE}
                      title={tile.title}
                      score={10}
                      brandPrimaryColor={tile.brandPrimaryColor}
                      textColor={tile.brandTextColor}
                    />
                  ) : null}
                  {tile.kind === "photo_wall" ? (
                    <PlayerPhotoWallCollageTile
                      preview
                      previewWidth={PREVIEW_TILE_SIZE}
                      photoSrcs={tile.photoSrcs}
                    />
                  ) : null}
                </Box>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2">{tile.label}</Typography>
                  {tile.kind === "banner" ? (
                    <Typography variant="caption" color="text.secondary">
                      Уникальных кликов: {bannerClickCounts[tile.banner.id] ?? 0}
                    </Typography>
                  ) : null}
                  {tile.kind === "banner" ? (
                    <Typography variant="body2" noWrap>
                      <Link
                        href={sanitizeBannerLinkUrl(tile.banner.linkUrl) || tile.banner.linkUrl}
                        {...(sanitizeBannerLinkUrl(tile.banner.linkUrl).startsWith("mailto:")
                          ? {}
                          : { target: "_blank", rel: "noopener noreferrer" })}
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
                  {tile.kind === "quiz_results" ? (
                    <Typography variant="caption" color="text.secondary">
                      Плитка 1×1: вкл/выкл в блоке управления квизом («Отчёт игрокам»)
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
                    <IconButton
                      size="small"
                      disabled={idx === 0 || isQuizResultsTileId(tile.id)}
                      onClick={() => onMoveUp(tile.id)}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={idx >= tiles.length - 1 || isQuizResultsTileId(tile.id)}
                      onClick={() => onMoveDown(tile.id)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    {tile.kind === "banner" ? (
                      <Tooltip
                        title={
                          tile.banner.isVisible
                            ? "Убрать с экрана пользователя"
                            : "Вывести на экран пользователя"
                        }
                      >
                        <IconButton
                          size="small"
                          aria-label={
                            tile.banner.isVisible
                              ? "Убрать с экрана пользователя"
                              : "Вывести на экран пользователя"
                          }
                          aria-pressed={tile.banner.isVisible}
                          color={tile.banner.isVisible ? "primary" : "default"}
                          onClick={() =>
                            onToggleBannerVisible(tile.banner.id, !tile.banner.isVisible)
                          }
                        >
                          {tile.banner.isVisible ? (
                            <VisibilityIcon fontSize="small" />
                          ) : (
                            <VisibilityOffIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {tile.kind === "photo_wall" ? (
                      <Tooltip
                        title={
                          photoWallTileVisible
                            ? "Скрыть плитку фотостены у пользователя"
                            : "Показать плитку фотостены пользователю"
                        }
                      >
                        <IconButton
                          size="small"
                          aria-label={
                            photoWallTileVisible
                              ? "Скрыть плитку фотостены у пользователя"
                              : "Показать плитку фотостены пользователю"
                          }
                          aria-pressed={photoWallTileVisible}
                          color={photoWallTileVisible ? "primary" : "default"}
                          onClick={() => onTogglePhotoWallTileVisible(!photoWallTileVisible)}
                        >
                          {photoWallTileVisible ? (
                            <VisibilityIcon fontSize="small" />
                          ) : (
                            <VisibilityOffIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {tile.kind === "banner" && editor.editingId !== tile.banner.id ? (
                      <Tooltip title="Редактировать">
                        <IconButton
                          size="small"
                          aria-label="Редактировать баннер"
                          onClick={() => onStartEdit(tile)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    {tile.kind === "banner" ? (
                      <IconButton
                        size="small"
                        color="error"
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
