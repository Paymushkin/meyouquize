import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Button, IconButton, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { ImagePreview } from "./ImagePreview";

type Props = {
  title: string;
  value: string;
  uploadErrorLabel: string;
  onUploadMedia: (file: File) => Promise<string>;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  /** Сброс до состояния без изображения (пустой URL). */
  onClear?: () => void;
  clearLabel?: string;
  clearIcon?: ReactNode;
  clearColor?:
    | "inherit"
    | "default"
    | "error"
    | "warning"
    | "primary"
    | "secondary"
    | "success"
    | "info";
  previewHeight?: number;
  /** Фиксированная ширина превью (вместе с previewHeight — «по размеру картинки»). */
  previewWidth?: number;
  /** Квадратный превью фиксированного размера (как плитка 1×1). */
  previewSize?: number;
  /** Доп. иконки справа от превью (после очистки). */
  trailingActions?: ReactNode;
  /** Кнопки у правого края (превью слева). */
  actionsAtEnd?: boolean;
};

export function BrandImageUploadTile(props: Props) {
  const {
    title,
    value,
    uploadErrorLabel,
    onUploadMedia,
    onUploaded,
    onError,
    onClear,
    clearLabel = "Удалить",
    clearIcon,
    clearColor = "error",
    previewHeight = 150,
    previewWidth,
    previewSize,
    trailingActions,
    actionsAtEnd = false,
  } = props;
  const hasImage = !!value.trim();
  const height = previewSize ?? previewHeight;
  const width = previewSize ?? previewWidth;
  const fixedPreview = width != null;
  const pushActionsEnd = actionsAtEnd || fixedPreview;

  return (
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          width: "100%",
          ...(pushActionsEnd ? { justifyContent: "space-between" } : null),
        }}
      >
        <Button
          component="label"
          variant="text"
          sx={{
            p: 0,
            minWidth: 0,
            borderRadius: 1,
            overflow: "hidden",
            ...(fixedPreview ? { width, height, flex: "0 0 auto" } : { flex: 1, width: "100%" }),
          }}
        >
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              try {
                const url = await onUploadMedia(file);
                onUploaded(url);
              } catch (error) {
                onError(error instanceof Error ? error.message : uploadErrorLabel);
              }
            }}
          />
          <ImagePreview label={title} url={value} height={height} />
        </Button>
        <Stack direction="row" spacing={1} alignItems="center">
          {hasImage && onClear ? (
            <IconButton
              aria-label={clearLabel}
              title={clearLabel}
              color={clearColor}
              onClick={onClear}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {clearIcon ?? <DeleteOutlineIcon />}
            </IconButton>
          ) : null}
          {trailingActions}
        </Stack>
      </Stack>
    </Stack>
  );
}
