import { useMemo, type ComponentProps } from "react";
import { AdminBrandingSection } from "../components/admin/AdminBrandingSection";

type BrandingProps = ComponentProps<typeof AdminBrandingSection>;

type Params = Omit<BrandingProps, "qrSettingsProps"> & {
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
};

export function useAdminBrandingProps(params: Params): BrandingProps {
  const {
    projectorJoinQrVisible,
    setProjectorJoinQrVisible,
    projectorJoinQrText,
    setProjectorJoinQrText,
    projectorJoinQrTextColor,
    setProjectorJoinQrTextColor,
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
    }),
    [
      projectorJoinQrVisible,
      setProjectorJoinQrVisible,
      projectorJoinQrText,
      setProjectorJoinQrText,
      projectorJoinQrTextColor,
      setProjectorJoinQrTextColor,
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
