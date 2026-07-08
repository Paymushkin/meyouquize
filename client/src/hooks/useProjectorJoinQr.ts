import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPlayerJoinUrl } from "../publicAppOrigin";

type Params = {
  slug: string;
  showEventTitleScreen: boolean;
  projectorJoinQrBlockVisible: boolean;
  projectorJoinQrOverlayVisible: boolean;
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
  const {
    slug,
    showEventTitleScreen,
    projectorJoinQrBlockVisible,
    projectorJoinQrOverlayVisible,
    overlaySizePx,
  } = params;
  const joinUrl = buildPlayerJoinUrl(slug);
  const showJoinQrBlock = showEventTitleScreen && projectorJoinQrBlockVisible;
  const showJoinQrOverlay = !showEventTitleScreen && projectorJoinQrOverlayVisible && Boolean(slug);
  const joinQrDataUrl = useQrDataUrl(joinUrl, showJoinQrBlock, 420);
  const joinQrOverlayDataUrl = useQrDataUrl(joinUrl, showJoinQrOverlay, overlaySizePx);

  return { showJoinQrBlock, showJoinQrOverlay, joinQrDataUrl, joinQrOverlayDataUrl };
}
