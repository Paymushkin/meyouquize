import { useCallback, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { Box, Dialog, DialogContent, IconButton, Typography } from "@mui/material";
import type { PhotoWallAlbumPhoto } from "@meyouquize/shared";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { photoWallDownloadFilename } from "../../features/quizPlay/downloadPhotoWallImage";
import { PLAYER_DIALOG_SECONDARY_TEXT, buildPlayerDialogPaperSx } from "./playerDialogStyles";

const PHOTO_DOWNLOAD_BUTTON_SX = {
  width: 36,
  height: 36,
  p: 0.75,
  bgcolor: "rgba(0, 0, 0, 0.45)",
  color: "#fff",
  "&:hover": {
    bgcolor: "rgba(0, 0, 0, 0.62)",
  },
} as const;

type Props = {
  open: boolean;
  photos: PhotoWallAlbumPhoto[];
  brandFontFamily: string;
  onClose: () => void;
};

export function PlayerPhotoWallDialog({ open, photos, brandFontFamily, onClose }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const handleCloseDialog = useCallback(() => {
    setLightboxIndex(-1);
    onClose();
  }, [onClose]);

  const slides = photos.map((photo) => ({
    src: photo.src,
    alt: `Фото ${photo.index}`,
  }));

  const renderPhotoDownloadButton = (photo: PhotoWallAlbumPhoto, size: number) => {
    const downloadName = photoWallDownloadFilename(photo);
    return (
      <IconButton
        component="a"
        href={photo.src}
        download={downloadName}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Скачать фото ${photo.index}`}
        size="small"
        onClick={(event) => event.stopPropagation()}
        sx={{
          ...PHOTO_DOWNLOAD_BUTTON_SX,
          width: size,
          height: size,
        }}
      >
        <DownloadIcon sx={{ width: size * 0.57, height: size * 0.57 }} />
      </IconButton>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseDialog}
        fullScreen
        scroll="paper"
        PaperProps={{
          sx: {
            ...buildPlayerDialogPaperSx(brandFontFamily),
            borderRadius: 0,
          },
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            justifyContent: "flex-end",
            px: 1,
            pt: 1,
            pb: 0.5,
          }}
        >
          <IconButton
            aria-label="Закрыть"
            onClick={handleCloseDialog}
            size="small"
            sx={{ color: "#fff" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
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
              {photos.map((photo, index) => {
                return (
                  <Box
                    key={photo.key}
                    sx={{
                      position: "relative",
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      borderRadius: 1,
                      cursor: "pointer",
                    }}
                    onClick={() => setLightboxIndex(index)}
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
                    <Box sx={{ position: "absolute", right: 4, bottom: 4 }}>
                      {renderPhotoDownloadButton(photo, 28)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        render={{
          slideFooter: ({ slide }) => {
            const photo = photos.find((item) => item.src === slide.src);
            if (!photo) return null;
            return (
              <Box sx={{ position: "absolute", right: 16, bottom: 20, zIndex: 2 }}>
                {renderPhotoDownloadButton(photo, 36)}
              </Box>
            );
          },
        }}
      />
    </>
  );
}
