import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPlayerJoinUrl } from "../publicAppOrigin";

type Params = {
  slug: string;
  showEventTitleScreen: boolean;
  projectorJoinQrVisible: boolean;
  overlaySizePx: number;
};

function useQrDataUrl(url: string, enabled: boolean, sizePx: number) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!enabled || !url) {
      setDataUrl("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, { margin: 1, width: sizePx }).then(
      (nextDataUrl) => {
        if (!cancelled) setDataUrl(nextDataUrl);
      },
      () => {
        if (!cancelled) setDataUrl("");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, sizePx, url]);

  return dataUrl;
}

export function useProjectorJoinQr(params: Params) {
  const { slug, showEventTitleScreen, projectorJoinQrVisible, overlaySizePx } = params;
  const joinUrl = buildPlayerJoinUrl(slug);
  const showJoinQrBlock = showEventTitleScreen && projectorJoinQrVisible;
  const showJoinQrOverlay = !showEventTitleScreen && projectorJoinQrVisible && Boolean(slug);
  const joinQrDataUrl = useQrDataUrl(joinUrl, showJoinQrBlock, 420);
  const joinQrOverlayDataUrl = useQrDataUrl(joinUrl, showJoinQrOverlay, overlaySizePx);

  return { showJoinQrBlock, showJoinQrOverlay, joinQrDataUrl, joinQrOverlayDataUrl };
}
