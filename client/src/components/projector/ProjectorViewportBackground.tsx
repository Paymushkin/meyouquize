import { Box } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { buildBrandBackground } from "../../features/branding/brandVisual";

type ProjectorViewportBackgroundProps = {
  backgroundColor: string;
  backgroundImageUrl?: string;
  /** CSS zoom на body (имитация Ctrl+/−). Фон компенсирует масштаб и остаётся на весь экран. */
  contentZoom?: number;
};

/**
 * Фон проектора на весь viewport (`cover`). При зуме браузера / CSS zoom на body
 * компенсирует масштаб — картинка остаётся «прибитой» к экрану.
 */
export function ProjectorViewportBackground({
  backgroundColor,
  backgroundImageUrl,
  contentZoom = 1,
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
      const browserScale = vv?.scale && Number.isFinite(vv.scale) ? vv.scale : 1;
      const cssZoom = Number.isFinite(contentZoom) && contentZoom > 0 ? contentZoom : 1;
      const scale = browserScale * cssZoom;

      if (Math.abs(scale - 1) < 0.001) {
        layer.style.top = "0";
        layer.style.left = "0";
        layer.style.width = "100%";
        layer.style.height = "100%";
        layer.style.transform = "none";
        return;
      }

      // Браузерный pinch/Ctrl-zoom: координаты visualViewport.
      if (vv && Math.abs(browserScale - 1) >= 0.001) {
        layer.style.top = `${vv.offsetTop}px`;
        layer.style.left = `${vv.offsetLeft}px`;
        layer.style.width = `${vv.width * browserScale}px`;
        layer.style.height = `${vv.height * browserScale}px`;
        layer.style.transform = `scale(${1 / scale})`;
        layer.style.transformOrigin = "top left";
        return;
      }

      // CSS zoom на body: отменяем масштаб у fixed-фона, чтобы он закрывал экран.
      layer.style.top = "0";
      layer.style.left = "0";
      layer.style.width = "100vw";
      layer.style.height = "100vh";
      layer.style.transform = `scale(${1 / cssZoom})`;
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
  }, [contentZoom]);

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
