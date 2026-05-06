import { useState } from "react";
import {
  DEFAULT_PROJECTOR_JOIN_QR_TEXT,
  DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
} from "../publicViewContract";

export function useProjectorJoinQrAdminSettings() {
  const [projectorJoinQrVisible, setProjectorJoinQrVisible] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_VISIBLE,
  );
  const [projectorJoinQrText, setProjectorJoinQrText] = useState(DEFAULT_PROJECTOR_JOIN_QR_TEXT);
  const [projectorJoinQrTextColor, setProjectorJoinQrTextColor] = useState(
    DEFAULT_PROJECTOR_JOIN_QR_TEXT_COLOR,
  );

  return {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
  };
}
