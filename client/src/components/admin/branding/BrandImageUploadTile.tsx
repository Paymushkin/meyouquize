import { Button, Stack, Typography } from "@mui/material";
import { ImagePreview } from "./ImagePreview";

type Props = {
  title: string;
  value: string;
  uploadErrorLabel: string;
  onUploadMedia: (file: File) => Promise<string>;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
};

export function BrandImageUploadTile(props: Props) {
  const { title, value, uploadErrorLabel, onUploadMedia, onUploaded, onError } = props;

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
    </Stack>
  );
}
