import { Button, Stack, Typography } from "@mui/material";
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
    clearLabel = "Сбросить",
  } = props;
  const hasImage = !!value.trim();

  return (
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Button
        component="label"
        variant="text"
        sx={{ p: 0, minWidth: 0, width: "100%", borderRadius: 1, overflow: "hidden" }}
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
        <ImagePreview label={title} url={value} height={150} />
      </Button>
      {hasImage && onClear ? (
        <Button
          size="small"
          color="inherit"
          onClick={onClear}
          sx={{ alignSelf: "flex-start", px: 0 }}
        >
          {clearLabel}
        </Button>
      ) : null}
    </Stack>
  );
}
