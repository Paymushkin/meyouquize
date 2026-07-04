import { Box } from "@mui/material";
import type { PhotoWallAlbumPhoto } from "@meyouquize/shared";
import type { ComponentType } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

type DownloadButtonProps = {
  photo: PhotoWallAlbumPhoto;
  size: number;
};

type Props = {
  index: number;
  photos: PhotoWallAlbumPhoto[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
  renderDownloadButton: ComponentType<DownloadButtonProps>;
};

export function PlayerPhotoWallLightbox({
  index,
  photos,
  onClose,
  onIndexChange,
  renderDownloadButton: DownloadButton,
}: Props) {
  const slides = photos.map((photo) => ({
    src: photo.src,
    alt: `Фото ${photo.index}`,
  }));

  return (
    <Lightbox
      open={index >= 0}
      index={index}
      close={onClose}
      slides={slides}
      carousel={{ finite: false }}
      controller={{ closeOnBackdropClick: true }}
      on={{ view: ({ index: nextIndex }) => onIndexChange(nextIndex) }}
      render={{
        slideFooter: ({ slide }) => {
          const photo = photos.find((item) => item.src === slide.src);
          if (!photo) return null;
          return (
            <Box sx={{ position: "absolute", right: 16, bottom: 20, zIndex: 2 }}>
              <DownloadButton photo={photo} size={36} />
            </Box>
          );
        },
      }}
    />
  );
}
