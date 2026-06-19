import { Box } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { buildBrandBackground } from "../../features/branding/brandVisual";

type ProjectorViewportBackgroundProps = {
  backgroundColor: string;
  backgroundImageUrl?: string;
};

/**
 * Фон проектора на весь viewport (`cover`). При зуме браузера компенсирует масштаб через
 * Visual Viewport API — картинка остаётся «прибитой» к экрану, масштабируется только контент.
 */
export function ProjectorViewportBackground({
  backgroundColor,
  backgroundImageUrl,
}: ProjectorViewportBackgroundProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const normalizedImageUrl = backgroundImageUrl?.trim() ?? "";
  const brandBg = useMemo(
    () => buildBrandBackground({ backgroundImageUrl: normalizedImageUrl || undefined }),
    [normalizedImageUrl],
  );

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof window === "undefined") return;

    const syncViewport = () => {
      const vv = window.visualViewport;
      if (!vv || Math.abs(vv.scale - 1) < 0.001) {
        layer.style.top = "0";
        layer.style.left = "0";
        layer.style.width = "100%";
        layer.style.height = "100%";
        layer.style.transform = "none";
        return;
      }
      layer.style.top = `${vv.offsetTop}px`;
      layer.style.left = `${vv.offsetLeft}px`;
      layer.style.width = `${vv.width * vv.scale}px`;
      layer.style.height = `${vv.height * vv.scale}px`;
      layer.style.transform = `scale(${1 / vv.scale})`;
      layer.style.transformOrigin = "top left";
    };

    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncViewport);
    vv?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      vv?.removeEventListener("resize", syncViewport);
      vv?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  return (
    <Box
      key={normalizedImageUrl || "no-image"}
      ref={layerRef}
      aria-hidden
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        backgroundColor,
        ...brandBg,
      }}
    />
  );
}
