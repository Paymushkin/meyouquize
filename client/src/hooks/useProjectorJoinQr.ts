import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Params = {
  slug: string;
  showEventTitleScreen: boolean;
  projectorJoinQrVisible: boolean;
};

export function useProjectorJoinQr(params: Params) {
  const { slug, showEventTitleScreen, projectorJoinQrVisible } = params;
  const [joinQrDataUrl, setJoinQrDataUrl] = useState("");
  const showJoinQrBlock = showEventTitleScreen && projectorJoinQrVisible;
  const joinUrl = slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${slug}`
    : "";

  useEffect(() => {
    if (!showJoinQrBlock || !joinUrl) {
      setJoinQrDataUrl("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, { margin: 1, width: 280 }).then(
      (nextDataUrl) => {
        if (!cancelled) setJoinQrDataUrl(nextDataUrl);
      },
      () => {
        if (!cancelled) setJoinQrDataUrl("");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [joinUrl, showJoinQrBlock]);

  return { showJoinQrBlock, joinQrDataUrl };
}
