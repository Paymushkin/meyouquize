import { useCallback, useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, Dialog, DialogContent, IconButton, Tab, Tabs, Typography } from "@mui/material";
import type { VideoWallAlbumVideo } from "@meyouquize/shared";
import { downloadVideoWallVideo } from "../../features/quizPlay/downloadVideoWallVideo";
import {
  videoWallHorizontalGridSx,
  videoWallVerticalGridSx,
} from "../../features/quizPlay/videoWallAlbumGrid";
import { buildPlayerDialogPaperSx, PLAYER_DIALOG_SECONDARY_TEXT } from "./playerDialogStyles";
import { PlayerVideoWallLightbox } from "./PlayerVideoWallLightbox";
import { VideoWallThumb } from "./VideoWallThumb";

type TabId = "horizontal" | "vertical";

const VIDEO_DOWNLOAD_BUTTON_SX = {
  bgcolor: "rgba(0, 0, 0, 0.45)",
  color: "#fff",
  "&:hover": {
    bgcolor: "rgba(0, 0, 0, 0.62)",
  },
} as const;

function VideoDownloadButton({ video, size }: { video: VideoWallAlbumVideo; size: number }) {
  return (
    <IconButton
      aria-label={`Скачать ${video.title || `видео ${video.index}`}`}
      size="small"
      onClick={(event) => {
        event.stopPropagation();
        void downloadVideoWallVideo(video);
      }}
      sx={{
        ...VIDEO_DOWNLOAD_BUTTON_SX,
        width: size,
        height: size,
        p: 0.5,
      }}
    >
      <DownloadIcon sx={{ width: size * 0.57, height: size * 0.57 }} />
    </IconButton>
  );
}

type Props = {
  open: boolean;
  horizontalVideos: VideoWallAlbumVideo[];
  verticalVideos: VideoWallAlbumVideo[];
  brandFontFamily: string;
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  onClose: () => void;
};

export function PlayerVideoWallDialog({
  open,
  horizontalVideos,
  verticalVideos,
  brandFontFamily,
  brandPrimaryColor,
  playerVoteOptionTextColor,
  onClose,
}: Props) {
  const hasHorizontal = horizontalVideos.length > 0;
  const hasVertical = verticalVideos.length > 0;
  const showTabs = hasHorizontal && hasVertical;

  const initialTab = useMemo<TabId>(() => {
    if (hasHorizontal) return "horizontal";
    return "vertical";
  }, [hasHorizontal]);

  const [tab, setTab] = useState<TabId>(initialTab);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    if (!open) return;
    setTab(hasHorizontal ? "horizontal" : "vertical");
    setLightboxIndex(-1);
  }, [open, hasHorizontal]);

  const activeVideos = tab === "horizontal" ? horizontalVideos : verticalVideos;
  const gridSx = tab === "horizontal" ? videoWallHorizontalGridSx : videoWallVerticalGridSx;
  const cellAspect = tab === "horizontal" ? "16 / 9" : "9 / 16";

  const handleCloseDialog = useCallback(() => {
    setLightboxIndex(-1);
    onClose();
  }, [onClose]);

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
            bgcolor: "rgba(0,0,0,0.85)",
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

        {showTabs ? (
          <Box
            sx={{
              position: "sticky",
              top: 40,
              zIndex: 1,
              px: 1.5,
              pt: 1,
              pb: 0,
              bgcolor: "rgba(0,0,0,0.92)",
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, next: TabId) => {
                setTab(next);
                setLightboxIndex(-1);
              }}
              variant="fullWidth"
              textColor="inherit"
              sx={{
                minHeight: 56,
                borderBottom: "1px solid rgba(255,255,255,0.18)",
                "& .MuiTabs-indicator": {
                  height: 3,
                  bgcolor: brandPrimaryColor,
                },
                "& .MuiTab-root": {
                  minHeight: 56,
                  py: 1.5,
                  px: 1.25,
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  textTransform: "none",
                  color: "rgba(255,255,255,0.55)",
                },
                "& .Mui-selected": {
                  color: brandPrimaryColor,
                },
              }}
            >
              <Tab value="horizontal" label="Горизонтальные" />
              <Tab value="vertical" label="Вертикальные" />
            </Tabs>
          </Box>
        ) : (
          <Typography
            variant="h6"
            sx={{
              color: "#fff",
              px: 2,
              pt: 1.5,
              pb: 0.5,
              fontWeight: 700,
              fontSize: "1.05rem",
            }}
          >
            {hasVertical && !hasHorizontal ? "Вертикальные" : "Горизонтальные"}
          </Typography>
        )}

        <DialogContent sx={{ pt: 1.5, px: 1.5, pb: 2 }}>
          {activeVideos.length === 0 ? (
            <Typography variant="body2" sx={PLAYER_DIALOG_SECONDARY_TEXT}>
              Нет видео
            </Typography>
          ) : (
            <Box sx={gridSx}>
              {activeVideos.map((video, index) => (
                <Box
                  key={video.key}
                  component="button"
                  type="button"
                  aria-label={video.title || `Открыть видео ${video.index}`}
                  onClick={() => setLightboxIndex(index)}
                  sx={{
                    position: "relative",
                    border: "none",
                    p: 0,
                    m: 0,
                    cursor: "pointer",
                    overflow: "hidden",
                    borderRadius: 0,
                    bgcolor: "#111",
                    aspectRatio: cellAspect,
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <VideoWallThumb src={video.src} posterUrl={video.posterUrl} />
                  <PlayArrowIcon
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 36,
                      height: 36,
                      p: 0.75,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      boxSizing: "content-box",
                    }}
                  />
                  <Box
                    sx={{ position: "absolute", right: 6, top: 6, zIndex: 1 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <VideoDownloadButton video={video} size={28} />
                  </Box>
                  {video.title ? (
                    <Typography
                      component="span"
                      sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        px: 1.25,
                        py: 1,
                        fontSize: { xs: 14, sm: 16 },
                        lineHeight: 1.25,
                        fontWeight: 700,
                        color: playerVoteOptionTextColor,
                        bgcolor: brandPrimaryColor,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {video.title}
                    </Typography>
                  ) : null}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {lightboxIndex >= 0 ? (
        <PlayerVideoWallLightbox
          index={lightboxIndex}
          videos={activeVideos}
          onClose={() => setLightboxIndex(-1)}
          onIndexChange={setLightboxIndex}
          renderDownloadButton={VideoDownloadButton}
        />
      ) : null}
    </>
  );
}
