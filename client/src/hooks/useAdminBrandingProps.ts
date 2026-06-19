import { useMemo, type ComponentProps } from "react";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";
import type { ProjectorJoinQrOverlayCorner } from "../publicViewContract";

type BrandingProps = ComponentProps<typeof AdminBrandingSection>;

type Params = Omit<BrandingProps, "qrSettingsProps"> & {
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  projectorJoinQrOverlaySizePx: number;
  setProjectorJoinQrOverlaySizePx: (value: number) => void;
  projectorJoinQrOverlayInsetPx: number;
  setProjectorJoinQrOverlayInsetPx: (value: number) => void;
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
  setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
};

export function useAdminBrandingProps(params: Params): BrandingProps {
  const {
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
    ...rest
  } = params;

  const qrSettingsProps = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return useMemo(
    () => ({
      ...rest,
      qrSettingsProps,
    }),
    [rest, qrSettingsProps],
  );
}
