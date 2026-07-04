import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  buildPhotoWallImageUrl,
  PHOTO_WALL_MAX_IMAGE_COUNT,
  type PhotoWallImageExt,
} from "@meyouquize/shared";
import { useState } from "react";

type Props = {
  baseUrl: string;
  imageCount: number;
  imageExt: PhotoWallImageExt;
  gridColumns: number;
  animate: boolean;
  kenBurns: boolean;
  tileVisible: boolean;
  projectorMode: boolean;
  onBaseUrlChange: (value: string) => void;
  onBaseUrlCommit: () => void;
  onImageCountChange: (value: number) => void;
  onImageCountCommit: () => void;
  onImageExtChange: (value: PhotoWallImageExt) => void;
  onGridColumnsChange: (value: number) => void;
  onGridColumnsCommit: () => void;
  onAnimateChange: (value: boolean) => void;
  onKenBurnsChange: (value: boolean) => void;
  onTileVisibleChange: (value: boolean) => void;
  onToggleProjector: () => void;
};

export function AdminPhotoWallSection(props: Props) {
  const {
    baseUrl,
    imageCount,
    imageExt,
    gridColumns,
    animate,
    kenBurns,
    tileVisible,
    projectorMode,
    onBaseUrlChange,
    onBaseUrlCommit,
    onImageCountChange,
    onImageCountCommit,
    onImageExtChange,
    onGridColumnsChange,
    onGridColumnsCommit,
    onAnimateChange,
    onKenBurnsChange,
    onTileVisibleChange,
    onToggleProjector,
  } = props;

  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "fail">("idle");
  const [previewUrl, setPreviewUrl] = useState("");

  const verifyFirstImage = async () => {
    const url = buildPhotoWallImageUrl(baseUrl, 1, imageExt);
    if (!url) {
      setVerifyState("fail");
      setPreviewUrl("");
      return;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load failed"));
        img.src = url;
      });
      setVerifyState("ok");
      setPreviewUrl(url);
    } catch {
      setVerifyState("fail");
      setPreviewUrl("");
    }
  };

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Загрузите фото в Yandex Object Storage: <code>1.jpeg</code>, <code>2.jpeg</code>, …
              Укажите HTTPS-URL папки (с <code>/</code> в конце) и количество файлов.
            </Typography>
            <TextField
              size="small"
              label="URL папки в бакете"
              placeholder="https://storage.yandexcloud.net/bucket/event/photowall/"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              onBlur={onBaseUrlCommit}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                type="number"
                label="Количество фото"
                value={imageCount}
                inputProps={{ min: 0, max: PHOTO_WALL_MAX_IMAGE_COUNT }}
                onChange={(e) => onImageCountChange(Math.max(0, Number(e.target.value) || 0))}
                onBlur={onImageCountCommit}
                sx={{ minWidth: 160 }}
              />
              <TextField
                select
                size="small"
                label="Расширение"
                value={imageExt}
                onChange={(e) => onImageExtChange(e.target.value as PhotoWallImageExt)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="jpeg">jpeg</MenuItem>
                <MenuItem value="jpg">jpg</MenuItem>
                <MenuItem value="png">png</MenuItem>
                <MenuItem value="webp">webp</MenuItem>
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Колонок водопада (0 = auto)"
                value={gridColumns}
                inputProps={{ min: 0, max: 12 }}
                onChange={(e) => onGridColumnsChange(Math.max(0, Number(e.target.value) || 0))}
                onBlur={onGridColumnsCommit}
                sx={{ minWidth: 160 }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch checked={animate} onChange={(_, v) => onAnimateChange(v)} size="small" />
              }
              label="Водопад (движение по экрану)"
            />
            <FormControlLabel
              control={
                <Switch checked={kenBurns} onChange={(_, v) => onKenBurnsChange(v)} size="small" />
              }
              label="Встраивание фото между другими"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={tileVisible}
                  onChange={(_, v) => onTileVisibleChange(v)}
                  size="small"
                />
              }
              label="Плитка-коллаж у участников"
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => void verifyFirstImage()}>
                Проверить 1.{imageExt}
              </Button>
              <Button
                size="small"
                variant={projectorMode ? "contained" : "outlined"}
                color={projectorMode ? "primary" : "inherit"}
                startIcon={projectorMode ? <SlideshowIcon /> : <SlideshowOutlinedIcon />}
                onClick={onToggleProjector}
              >
                {projectorMode ? "Скрыть с экрана" : "Показать на проекторе"}
              </Button>
            </Stack>
            {verifyState === "ok" && previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt="Превью"
                sx={{ maxWidth: 280, maxHeight: 180, borderRadius: 1, objectFit: "cover" }}
              />
            ) : null}
            {verifyState === "fail" ? (
              <Typography variant="body2" color="error">
                Не удалось загрузить 1.{imageExt}. Проверьте URL, публичный доступ и имя файла.
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
