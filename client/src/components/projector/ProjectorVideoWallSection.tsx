import { Box, Stack, Typography } from "@mui/material";
import {
  clampVideoWallProjectorActiveSeconds,
  clampVideoWallProjectorFreezeSeconds,
  pickVideoWallProjectorVideos,
  type VideoWallAlbumVideo,
} from "@meyouquize/shared";
import { useEffect, useMemo, useState } from "react";
import type { PublicViewPayload } from "../../publicViewContract";
import { VideoWallVideo } from "../quiz/VideoWallVideo";

type Props = {
  view: PublicViewPayload;
};

const STRIP_HEIGHT_PX = 128;

function StripTile({
  video,
  active,
  freezeSeconds,
}: {
  video: VideoWallAlbumVideo;
  active: boolean;
  freezeSeconds: number;
}) {
  const vertical = video.orientation === "vertical";
  const width = vertical
    ? Math.round((STRIP_HEIGHT_PX * 9) / 16)
    : Math.round((STRIP_HEIGHT_PX * 16) / 9);

  return (
    <Box
      sx={{
        width,
        height: STRIP_HEIGHT_PX,
        flex: "0 0 auto",
        overflow: "hidden",
        borderRadius: 0,
        bgcolor: "#000",
        opacity: active ? 1 : 0.55,
        transform: active ? "scale(1.04)" : "scale(1)",
        transformOrigin: "center bottom",
        transition: "opacity 220ms ease, transform 220ms ease, box-shadow 220ms ease",
        boxShadow: active
          ? "0 0 0 2px rgba(255,255,255,0.92), 0 8px 20px rgba(0,0,0,0.45)"
          : "0 0 0 1px rgba(255,255,255,0.08)",
        zIndex: active ? 1 : 0,
      }}
    >
      <VideoWallVideo
        src={video.src}
        muted
        playsInline
        loop
        playing={false}
        preload="metadata"
        seekPreviewFrame
        seekPreviewAtSeconds={freezeSeconds}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </Box>
  );
}

export function ProjectorVideoWallSection({ view }: Props) {
  const videos = useMemo(
    () =>
      pickVideoWallProjectorVideos({
        horizontalItems: view.videoWallHorizontalItems ?? [],
        verticalItems: view.videoWallVerticalItems ?? [],
        showHorizontal: view.videoWallProjectorShowHorizontal ?? true,
        showVertical: view.videoWallProjectorShowVertical ?? true,
        maxVideos: view.videoWallProjectorMaxVideos ?? 12,
      }),
    [
      view.videoWallHorizontalItems,
      view.videoWallVerticalItems,
      view.videoWallProjectorShowHorizontal,
      view.videoWallProjectorShowVertical,
      view.videoWallProjectorMaxVideos,
    ],
  );

  const videoKeys = videos.map((video) => video.key).join("|");
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeAspect, setActiveAspect] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [videoKeys]);

  const activeSeconds = clampVideoWallProjectorActiveSeconds(
    view.videoWallProjectorActiveSeconds ?? 8,
  );
  const freezeSeconds = clampVideoWallProjectorFreezeSeconds(
    view.videoWallProjectorFreezeSeconds ?? 10,
  );

  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % videos.length);
    }, activeSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [videos.length, videoKeys, activeSeconds]);

  const safeActiveIndex = videos.length === 0 ? 0 : activeIndex % videos.length;
  const active = videos[safeActiveIndex];
  const showStrip = videos.length > 1;

  useEffect(() => {
    setActiveAspect(null);
  }, [active?.key]);

  if (videos.length === 0 || !active) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ width: "100%", height: "100%", minHeight: 0, px: 3 }}
      >
        <Typography variant="h5" sx={{ color: view.voteOptionTextColor, opacity: 0.85 }}>
          Нет видео для видеостены
        </Typography>
      </Stack>
    );
  }

  const fallbackAspect = active.orientation === "vertical" ? 9 / 16 : 16 / 9;
  const aspect = activeAspect && activeAspect > 0 ? activeAspect : fallbackAspect;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        p: { xs: 1, md: 1.25 },
        boxSizing: "border-box",
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: showStrip ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)",
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          containerType: "size",
        }}
      >
        <Box
          key={active.key}
          sx={{
            aspectRatio: `${aspect}`,
            maxWidth: "100%",
            maxHeight: "100%",
            width: `min(100cqw, calc(100cqh * ${aspect}))`,
            height: `min(100cqh, calc(100cqw / ${aspect}))`,
            overflow: "hidden",
            borderRadius: 0,
            bgcolor: "#000",
            boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
            animation: "vwHeroIn 520ms ease",
            "@keyframes vwHeroIn": {
              from: { opacity: 0.35, transform: "scale(0.965)" },
              to: { opacity: 1, transform: "scale(1)" },
            },
          }}
        >
          <VideoWallVideo
            src={active.src}
            muted
            playsInline
            loop
            autoPlay
            playing
            startAtSeconds={freezeSeconds}
            preload="auto"
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              if (el.videoWidth > 0 && el.videoHeight > 0) {
                setActiveAspect(el.videoWidth / el.videoHeight);
              }
            }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              display: "block",
            }}
          />
        </Box>
      </Box>

      {showStrip ? (
        <Box
          sx={{
            display: "flex",
            flexWrap: "nowrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            minHeight: STRIP_HEIGHT_PX + 8,
            overflowX: "auto",
            overflowY: "hidden",
            px: 0.5,
            pt: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {videos.map((video, index) => (
            <StripTile
              key={video.key}
              video={video}
              active={index === safeActiveIndex}
              freezeSeconds={freezeSeconds}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
