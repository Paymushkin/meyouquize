import { useState } from "react";
import {
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  type ProjectorJoinQrOverlayCorner,
} from "../publicViewContract";

export function useProjectorJoinQrAdminSettings() {
  const [projectorJoinQrVisible, setProjectorJoinQrVisible] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  );
  const [projectorJoinQrText, setProjectorJoinQrText] = useState(DEFAULT_PROJECTOR_JOIN_QR_TEXT);
  const [projectorJoinQrTextColor, setProjectorJoinQrTextColor] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  );
  const [projectorJoinQrOverlaySizePx, setProjectorJoinQrOverlaySizePx] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  );
  const [projectorJoinQrOverlayInsetPx, setProjectorJoinQrOverlayInsetPx] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_PX,
  );
  const [projectorJoinQrOverlayCorner, setProjectorJoinQrOverlayCorner] =
    useState<ProjectorJoinQrOverlayCorner>(DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER);

  return {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetPx,
    setProjectorJoinQrOverlayInsetPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
  };
}
