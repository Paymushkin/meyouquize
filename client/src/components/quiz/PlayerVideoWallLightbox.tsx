import { Box } from "@mui/material";
import type { VideoWallAlbumVideo } from "@meyouquize/shared";
import type { ComponentType } from "react";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

type DownloadButtonProps = {
  video: VideoWallAlbumVideo;
  size: number;
};

type Props = {
  index: number;
  videos: VideoWallAlbumVideo[];
  onClose: () => void;
  onIndexChange: (index: number) => void;
  renderDownloadButton: ComponentType<DownloadButtonProps>;
};

export function PlayerVideoWallLightbox({
  index,
  videos,
  onClose,
  onIndexChange,
  renderDownloadButton: DownloadButton,
}: Props) {
  const slides = videos.map((video) => {
    const poster = video.posterUrl.trim() ? resolveClientAssetUrl(video.posterUrl) : "";
    return {
      type: "video" as const,
      title: video.title,
      description: video.title,
      autoPlay: true,
      controls: true,
      playsInline: true,
      muted: true,
      ...(poster ? { poster } : {}),
      sources: [
        {
          src: video.src,
          type: "video/mp4",
        },
      ],
    };
  });

  return (
    <Lightbox
      open={index >= 0}
      index={index}
      close={onClose}
      slides={slides}
      plugins={[Video]}
      carousel={{ finite: false }}
      controller={{ closeOnBackdropClick: true }}
      video={{
        autoPlay: true,
        controls: true,
        playsInline: true,
        muted: true,
        preload: "metadata",
      }}
      on={{ view: ({ index: nextIndex }) => onIndexChange(nextIndex) }}
      render={{
        slideFooter: ({ slide }) => {
          const sources = "sources" in slide && Array.isArray(slide.sources) ? slide.sources : [];
          const slideSrc =
            sources[0] && typeof sources[0] === "object" && "src" in sources[0]
              ? String(sources[0].src)
              : "";
          if (!slideSrc) return null;
          const video = videos.find((item) => item.src === slideSrc);
          if (!video) return null;
          return (
            <Box sx={{ position: "absolute", right: 16, bottom: 20, zIndex: 2 }}>
              <DownloadButton video={video} size={36} />
            </Box>
          );
        },
      }}
    />
  );
}
