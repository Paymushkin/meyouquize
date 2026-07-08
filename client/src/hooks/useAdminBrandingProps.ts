import { useMemo, type ComponentProps } from "react";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";
import type { ProjectorJoinQrOverlayCorner } from "../publicViewContract";

type BrandingProps = ComponentProps<typeof AdminBrandingSection>;

type Params = Omit<BrandingProps, "qrSettingsProps"> & {
  projectorJoinQrOverlayVisible: boolean;
  setProjectorJoinQrOverlayVisible: (value: boolean) => void;
  projectorJoinQrOverlaySizePx: number;
  setProjectorJoinQrOverlaySizePx: (value: number) => void;
  projectorJoinQrOverlayInsetVerticalPx: number;
  setProjectorJoinQrOverlayInsetVerticalPx: (value: number) => void;
  projectorJoinQrOverlayInsetHorizontalPx: number;
  setProjectorJoinQrOverlayInsetHorizontalPx: (value: number) => void;
  projectorJoinQrOverlayCorner: ProjectorJoinQrOverlayCorner;
  setProjectorJoinQrOverlayCorner: (value: ProjectorJoinQrOverlayCorner) => void;
};

export function useAdminBrandingProps(params: Params): BrandingProps {
  const {
    projectorJoinQrOverlayVisible,
    setProjectorJoinQrOverlayVisible,
    projectorJoinQrOverlaySizePx,
    setProjectorJoinQrOverlaySizePx,
    projectorJoinQrOverlayInsetVerticalPx,
    setProjectorJoinQrOverlayInsetVerticalPx,
    projectorJoinQrOverlayInsetHorizontalPx,
    setProjectorJoinQrOverlayInsetHorizontalPx,
    projectorJoinQrOverlayCorner,
    setProjectorJoinQrOverlayCorner,
    ...rest
  } = params;

  const qrSettingsProps = useMemo(
    () => ({
      projectorJoinQrOverlayVisible,
      setProjectorJoinQrOverlayVisible,
      projectorJoinQrOverlaySizePx,
      setProjectorJoinQrOverlaySizePx,
      projectorJoinQrOverlayInsetVerticalPx,
      setProjectorJoinQrOverlayInsetVerticalPx,
      projectorJoinQrOverlayInsetHorizontalPx,
      setProjectorJoinQrOverlayInsetHorizontalPx,
      projectorJoinQrOverlayCorner,
      setProjectorJoinQrOverlayCorner,
    }),
    [
      projectorJoinQrOverlayVisible,
      setProjectorJoinQrOverlayVisible,
      projectorJoinQrOverlaySizePx,
      setProjectorJoinQrOverlaySizePx,
      projectorJoinQrOverlayInsetVerticalPx,
      setProjectorJoinQrOverlayInsetVerticalPx,
      projectorJoinQrOverlayInsetHorizontalPx,
      setProjectorJoinQrOverlayInsetHorizontalPx,
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
