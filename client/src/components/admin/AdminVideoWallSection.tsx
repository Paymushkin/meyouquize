import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  VIDEO_WALL_MAX_ITEM_COUNT,
  VIDEO_WALL_PROJECTOR_MAX_ACTIVE_SECONDS,
  VIDEO_WALL_PROJECTOR_MAX_FREEZE_SECONDS,
  type VideoWallItem,
} from "@meyouquize/shared";
import { useState } from "react";
import { BrandImageUploadTile } from "./branding/BrandImageUploadTile";

type Props = {
  horizontalItems: VideoWallItem[];
  verticalItems: VideoWallItem[];
  horizontalPosterUrl: string;
  verticalPosterUrl: string;
  tileCoverUrl: string;
  tileVisible: boolean;
  projectorMode: boolean;
  projectorShowHorizontal: boolean;
  projectorShowVertical: boolean;
  projectorActiveSeconds: number;
  projectorFreezeSeconds: number;
  onHorizontalItemsChange: (items: VideoWallItem[]) => void;
  onVerticalItemsChange: (items: VideoWallItem[]) => void;
  onHorizontalPosterUrlChange: (value: string) => void;
  onVerticalPosterUrlChange: (value: string) => void;
  onTileCoverUrlChange: (value: string) => void;
  onCommit: () => void;
  onTileVisibleChange: (value: boolean) => void;
  onProjectorShowHorizontalChange: (value: boolean) => void;
  onProjectorShowVerticalChange: (value: boolean) => void;
  onProjectorActiveSecondsChange: (value: number) => void;
  onProjectorFreezeSecondsChange: (value: number) => void;
  onToggleProjector: () => void;
  onUploadMedia: (file: File) => Promise<string>;
  onUploadError: (message: string) => void;
};

type OrientationEditor = "horizontal" | "vertical" | null;

function newItemId(): string {
  return `vw_${Math.random().toString(36).slice(2, 10)}`;
}

function videoCountLabel(count: number): string {
  return `${count} видео`;
}

function OrientationCard({
  title,
  posterTitle,
  orientation,
  items,
  posterUrl,
  onPosterUrlChange,
  onEditList,
  onUploadMedia,
  onUploadError,
}: {
  title: string;
  posterTitle: string;
  orientation: "horizontal" | "vertical";
  items: VideoWallItem[];
  posterUrl: string;
  onPosterUrlChange: (value: string) => void;
  onEditList: () => void;
  onUploadMedia: (file: File) => Promise<string>;
  onUploadError: (message: string) => void;
}) {
  const previewHeight = 140;
  const previewWidth =
    orientation === "vertical"
      ? Math.round((previewHeight * 9) / 16)
      : Math.round((previewHeight * 16) / 9);

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack spacing={1.25}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
            <Typography variant="subtitle1">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {videoCountLabel(items.length)}
            </Typography>
          </Stack>
          <BrandImageUploadTile
            title={posterTitle}
            value={posterUrl}
            previewWidth={previewWidth}
            previewHeight={previewHeight}
            actionsAtEnd
            uploadErrorLabel="Не удалось загрузить постер"
            onUploadMedia={onUploadMedia}
            onUploaded={onPosterUrlChange}
            onError={onUploadError}
            onClear={() => onPosterUrlChange("")}
            clearLabel="Сбросить постер"
            clearIcon={<RestartAltIcon />}
            clearColor="warning"
            trailingActions={
              <Tooltip title="Редактировать список">
                <IconButton
                  onClick={onEditList}
                  aria-label="Редактировать список"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <EditOutlinedIcon />
                </IconButton>
              </Tooltip>
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

function ItemsEditDialog({
  open,
  title,
  items,
  onChange,
  onCommit,
  onClose,
}: {
  open: boolean;
  title: string;
  items: VideoWallItem[];
  onChange: (items: VideoWallItem[]) => void;
  onCommit: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25} sx={{ pt: 0.5 }}>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                onChange([
                  ...items,
                  { id: newItemId(), url: "", title: `Видео ${items.length + 1}` },
                ])
              }
              disabled={items.length >= VIDEO_WALL_MAX_ITEM_COUNT}
            >
              Добавить
            </Button>
          </Stack>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Список пуст
            </Typography>
          ) : (
            items.map((item, index) => (
              <Stack
                key={item.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "flex-start" }}
              >
                <TextField
                  size="small"
                  label="Название"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, title: e.target.value };
                    onChange(next);
                  }}
                  onBlur={onCommit}
                  sx={{ minWidth: { sm: 160 }, flex: { sm: "0 0 180px" } }}
                />
                <TextField
                  size="small"
                  label="HTTPS-ссылка на видео"
                  placeholder="https://storage.yandexcloud.net/.../clip.mp4"
                  value={item.url}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, url: e.target.value };
                    onChange(next);
                  }}
                  onBlur={onCommit}
                  fullWidth
                />
                <IconButton
                  size="small"
                  aria-label="Удалить видео"
                  onClick={() => {
                    // Не вызывать onCommit здесь: он читает ещё не обновлённый state
                    // и затирает удаление полным снимком со старым списком.
                    onChange(items.filter((x) => x.id !== item.id));
                  }}
                  sx={{ mt: { sm: 0.5 } }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Готово</Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminVideoWallSection(props: Props) {
  const {
    horizontalItems,
    verticalItems,
    horizontalPosterUrl,
    verticalPosterUrl,
    tileCoverUrl,
    tileVisible,
    projectorMode,
    projectorShowHorizontal,
    projectorShowVertical,
    projectorActiveSeconds,
    projectorFreezeSeconds,
    onHorizontalItemsChange,
    onVerticalItemsChange,
    onHorizontalPosterUrlChange,
    onVerticalPosterUrlChange,
    onTileCoverUrlChange,
    onCommit,
    onTileVisibleChange,
    onProjectorShowHorizontalChange,
    onProjectorShowVerticalChange,
    onProjectorActiveSecondsChange,
    onProjectorFreezeSecondsChange,
    onToggleProjector,
    onUploadMedia,
    onUploadError,
  } = props;

  const [editor, setEditor] = useState<OrientationEditor>(null);

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">Общие</Typography>
            <BrandImageUploadTile
              title="Постер плитки"
              value={tileCoverUrl}
              previewSize={140}
              actionsAtEnd
              uploadErrorLabel="Не удалось загрузить постер"
              onUploadMedia={onUploadMedia}
              onUploaded={onTileCoverUrlChange}
              onError={onUploadError}
              onClear={() => onTileCoverUrlChange("")}
              clearLabel="Сбросить постер"
              clearIcon={<RestartAltIcon />}
              clearColor="warning"
              trailingActions={
                <>
                  <Tooltip
                    title={
                      tileVisible ? "Скрыть плитку у участников" : "Показать плитку у участников"
                    }
                  >
                    <IconButton
                      color={tileVisible ? "primary" : "default"}
                      onClick={() => onTileVisibleChange(!tileVisible)}
                      aria-label={
                        tileVisible ? "Скрыть плитку у участников" : "Показать плитку у участников"
                      }
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      {tileVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={projectorMode ? "Скрыть с экрана" : "Показать на проекторе"}>
                    <IconButton
                      color={projectorMode ? "primary" : "default"}
                      onClick={onToggleProjector}
                      aria-label={projectorMode ? "Скрыть с экрана" : "Показать на проекторе"}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      {projectorMode ? <SlideshowIcon /> : <SlideshowOutlinedIcon />}
                    </IconButton>
                  </Tooltip>
                </>
              }
            />
            <Typography variant="caption" color="text.secondary">
              На проекторе
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
              useFlexGap
              flexWrap="wrap"
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={projectorShowHorizontal}
                    onChange={(_, checked) => onProjectorShowHorizontalChange(checked)}
                  />
                }
                label="Горизонтальные"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={projectorShowVertical}
                    onChange={(_, checked) => onProjectorShowVerticalChange(checked)}
                  />
                }
                label="Вертикальные"
              />
              <Stack spacing={0.5} sx={{ width: 140 }}>
                <Typography variant="caption" color="text.secondary">
                  Секунд активно
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={projectorActiveSeconds}
                  onChange={(e) => onProjectorActiveSecondsChange(Number(e.target.value))}
                  onBlur={onCommit}
                  inputProps={{ min: 2, max: VIDEO_WALL_PROJECTOR_MAX_ACTIVE_SECONDS, step: 1 }}
                  fullWidth
                />
              </Stack>
              <Stack spacing={0.5} sx={{ width: 140 }}>
                <Typography variant="caption" color="text.secondary">
                  Стоп-кадр (сек)
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={projectorFreezeSeconds}
                  onChange={(e) => onProjectorFreezeSecondsChange(Number(e.target.value))}
                  onBlur={onCommit}
                  inputProps={{ min: 0, max: VIDEO_WALL_PROJECTOR_MAX_FREEZE_SECONDS, step: 1 }}
                  fullWidth
                />
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <OrientationCard
          title="Горизонтальные"
          posterTitle="Постер для игроков"
          orientation="horizontal"
          items={horizontalItems}
          posterUrl={horizontalPosterUrl}
          onPosterUrlChange={onHorizontalPosterUrlChange}
          onEditList={() => setEditor("horizontal")}
          onUploadMedia={onUploadMedia}
          onUploadError={onUploadError}
        />
        <OrientationCard
          title="Вертикальные"
          posterTitle="Постер для игроков"
          orientation="vertical"
          items={verticalItems}
          posterUrl={verticalPosterUrl}
          onPosterUrlChange={onVerticalPosterUrlChange}
          onEditList={() => setEditor("vertical")}
          onUploadMedia={onUploadMedia}
          onUploadError={onUploadError}
        />
      </Box>

      <ItemsEditDialog
        open={editor === "horizontal"}
        title="Горизонтальные видео"
        items={horizontalItems}
        onChange={onHorizontalItemsChange}
        onCommit={onCommit}
        onClose={() => {
          onCommit();
          setEditor(null);
        }}
      />
      <ItemsEditDialog
        open={editor === "vertical"}
        title="Вертикальные видео"
        items={verticalItems}
        onChange={onVerticalItemsChange}
        onCommit={onCommit}
        onClose={() => {
          onCommit();
          setEditor(null);
        }}
      />
    </Stack>
  );
}
