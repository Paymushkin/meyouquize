import { Box, type BoxProps } from "@mui/material";
import { withVideoWallPlaybackContentType } from "@meyouquize/shared";
import { useEffect, useRef } from "react";

type Props = Omit<BoxProps<"video">, "component" | "children"> & {
  src: string;
  /** Подтянуть кадр превью (preload=metadata). */
  seekPreviewFrame?: boolean;
  /** Секунда стоп-кадра; по умолчанию ~начало ролика. */
  seekPreviewAtSeconds?: number;
  /** Стартовать воспроизведение с этой секунды (и после loop). */
  startAtSeconds?: number;
  /** Явное play/pause (проектор: активный в центре / пауза по периметру). */
  playing?: boolean;
};

function resolvePreviewTime(duration: number, atSeconds: number | undefined): number {
  if (Number.isFinite(atSeconds) && (atSeconds as number) >= 0) {
    if (Number.isFinite(duration) && duration > 0) {
      return Math.min(atSeconds as number, Math.max(0, duration - 0.05));
    }
    return atSeconds as number;
  }
  if (Number.isFinite(duration) && duration > 0) {
    return Math.min(0.15, Math.max(0.04, duration * 0.02));
  }
  return 0.1;
}

function seekVideoTo(el: HTMLVideoElement, seconds: number | undefined): Promise<void> {
  const target = resolvePreviewTime(el.duration, seconds);
  if (!Number.isFinite(target)) return Promise.resolve();
  if (Math.abs(el.currentTime - target) < 0.04) return Promise.resolve();
  return new Promise((resolve) => {
    const onSeeked = () => {
      el.removeEventListener("seeked", onSeeked);
      resolve();
    };
    el.addEventListener("seeked", onSeeked);
    try {
      el.currentTime = target;
    } catch {
      el.removeEventListener("seeked", onSeeked);
      resolve();
    }
  });
}

/** Видеостена: полный URL ролика. */
export function VideoWallVideo({
  src,
  seekPreviewFrame = false,
  seekPreviewAtSeconds,
  startAtSeconds,
  playing,
  sx,
  onLoadedMetadata,
  ...rest
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const safeSrc = withVideoWallPlaybackContentType(src);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || playing === undefined) return;
    let cancelled = false;

    const run = async () => {
      if (playing && startAtSeconds !== undefined) {
        await seekVideoTo(el, startAtSeconds);
        if (cancelled) return;
      }
      if (playing) {
        void el.play().catch(() => {
          // autoplay blocked
        });
        return;
      }
      el.pause();
    };

    if (playing && startAtSeconds !== undefined && el.readyState < 1) {
      const onMeta = () => {
        void run();
      };
      el.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => {
        cancelled = true;
        el.removeEventListener("loadedmetadata", onMeta);
      };
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [playing, safeSrc, startAtSeconds]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playing || startAtSeconds === undefined) return;
    let passedStart = false;
    const onTimeUpdate = () => {
      if (el.currentTime >= startAtSeconds + 0.4) passedStart = true;
      // После loop браузер возвращает в 0 — снова с стоп-кадра.
      if (passedStart && el.currentTime < 0.25) {
        passedStart = false;
        void seekVideoTo(el, startAtSeconds);
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [playing, safeSrc, startAtSeconds]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !safeSrc || !seekPreviewFrame) return;
    let cancelled = false;

    const paintPreviewFrame = async () => {
      await seekVideoTo(el, seekPreviewAtSeconds);
      if (cancelled) return;
      try {
        el.muted = true;
        await el.play();
        if (cancelled) return;
        el.pause();
      } catch {
        // autoplay blocked
      }
    };

    const onReady = () => {
      void paintPreviewFrame();
    };

    if (el.readyState >= 1) onReady();
    else el.addEventListener("loadedmetadata", onReady, { once: true });

    return () => {
      cancelled = true;
      el.removeEventListener("loadedmetadata", onReady);
    };
  }, [safeSrc, seekPreviewFrame, seekPreviewAtSeconds]);

  if (!safeSrc) {
    return (
      <Box
        aria-hidden
        sx={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          bgcolor: "#111",
          ...(typeof sx === "object" && sx && !Array.isArray(sx) ? sx : {}),
        }}
      />
    );
  }

  return (
    <Box
      component="video"
      ref={videoRef}
      key={safeSrc}
      src={safeSrc}
      sx={sx}
      onLoadedMetadata={onLoadedMetadata}
      {...rest}
    />
  );
}
