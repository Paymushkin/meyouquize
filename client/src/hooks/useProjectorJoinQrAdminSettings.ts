import { useState } from "react";
import {
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE,
  type ProjectorJoinQrOverlayCorner,
} from "../publicViewContract";

export function useProjectorJoinQrAdminSettings() {
  const [projectorJoinQrVisible, setProjectorJoinQrVisible] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  );
  const [projectorJoinQrOverlayVisible, setProjectorJoinQrOverlayVisible] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_VISIBLE,
  );
  const [projectorJoinQrText, setProjectorJoinQrText] = useState(DEFAULT_PROJECTOR_JOIN_QR_TEXT);
  const [projectorJoinQrTextColor, setProjectorJoinQrTextColor] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  );
  const [projectorJoinQrOverlaySizePx, setProjectorJoinQrOverlaySizePx] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_SIZE_PX,
  );
  const [projectorJoinQrOverlayInsetVerticalPx, setProjectorJoinQrOverlayInsetVerticalPx] =
    useState(DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_VERTICAL_PX);
  const [projectorJoinQrOverlayInsetHorizontalPx, setProjectorJoinQrOverlayInsetHorizontalPx] =
    useState(DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_INSET_HORIZONTAL_PX);
  const [projectorJoinQrOverlayCorner, setProjectorJoinQrOverlayCorner] =
    useState<ProjectorJoinQrOverlayCorner>(DEFAULT_PROJECTOR_JOIN_QR_OVERLAY_CORNER);

  return {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrOverlayVisible,
    setProjectorJoinQrOverlayVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetVerticalPx,
    setProjectorJoinQrOverlayInsetVerticalPx,
    projectorJoinQrOverlayInsetHorizontalPx,
    setProjectorJoinQrOverlayInsetHorizontalPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
  };
}
