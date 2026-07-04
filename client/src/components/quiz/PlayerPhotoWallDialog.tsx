import { useCallback, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import type { PhotoWallAlbumPhoto } from "@meyouquize/shared";
import {
  downloadPhotoWallImage,
  photoWallDownloadFilename,
} from "../../features/quizPlay/downloadPhotoWallImage";
import {
  PLAYER_DIALOG_SECONDARY_TEXT,
  PLAYER_DIALOG_TITLE_SX,
  buildPlayerDialogPaperSx,
} from "./playerDialogStyles";

type Props = {
  open: boolean;
  photos: PhotoWallAlbumPhoto[];
  brandFontFamily: string;
  onClose: () => void;
};

export function PlayerPhotoWallDialog({ open, photos, brandFontFamily, onClose }: Props) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownload = useCallback(async (photo: PhotoWallAlbumPhoto) => {
    setDownloadingKey(photo.key);
    try {
      await downloadPhotoWallImage(photo);
    } finally {
      setDownloadingKey((current) => (current === photo.key ? null : current));
    }
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      scroll="paper"
      PaperProps={{
        sx: {
          ...buildPlayerDialogPaperSx(brandFontFamily),
          borderRadius: 0,
        },
      }}
    >
      <DialogTitle sx={{ ...PLAYER_DIALOG_TITLE_SX, flexShrink: 0, px: 2, pt: 2, pb: 1 }}>
        <Stack spacing={0.25}>
          <Typography component="span" variant="h6" sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
            Фотографии
          </Typography>
          {photos.length > 0 ? (
            <Typography component="span" variant="caption" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
              {photos.length} фото
            </Typography>
          ) : null}
        </Stack>
        <IconButton aria-label="Закрыть" onClick={onClose} size="small" sx={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          px: { xs: 1.5, sm: 2 },
          pt: 0,
          pb: { xs: 2, sm: 2.5 },
          color: "#fff",
          overflow: "auto",
        }}
      >
        {photos.length === 0 ? (
          <Typography variant="body2" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
            Фотографии недоступны
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(3, minmax(0, 1fr))",
                sm: "repeat(4, minmax(0, 1fr))",
                md: "repeat(5, minmax(0, 1fr))",
              },
              gap: { xs: 0.75, sm: 1 },
            }}
          >
            {photos.map((photo) => {
              const isDownloading = downloadingKey === photo.key;
              const downloadName = photoWallDownloadFilename(photo);
              return (
                <Box
                  key={photo.key}
                  sx={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderRadius: 1,
                  }}
                >
                  <Box
                    component="a"
                    href={photo.src}
                    download={downloadName}
                    rel="noopener noreferrer"
                    sx={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Box
                      component="img"
                      src={photo.src}
                      alt={`Фото ${photo.index}`}
                      loading="lazy"
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                      }}
                    />
                  </Box>
                  <IconButton
                    component="a"
                    href={photo.src}
                    download={downloadName}
                    rel="noopener noreferrer"
                    aria-label={`Скачать фото ${photo.index}`}
                    size="small"
                    disabled={isDownloading}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDownload(photo);
                    }}
                    sx={{
                      position: "absolute",
                      right: 4,
                      bottom: 4,
                      width: 28,
                      height: 28,
                      p: 0.5,
                      bgcolor: "rgba(0, 0, 0, 0.45)",
                      color: "#fff",
                      "&:hover": {
                        bgcolor: "rgba(0, 0, 0, 0.62)",
                      },
                      "&.Mui-disabled": {
                        bgcolor: "rgba(0, 0, 0, 0.45)",
                        color: "#fff",
                      },
                    }}
                  >
                    {isDownloading ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <DownloadIcon sx={{ width: 16, height: 16 }} />
                    )}
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
