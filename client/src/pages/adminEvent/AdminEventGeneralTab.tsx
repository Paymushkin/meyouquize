import { Stack } from "@mui/material";
import type {
  NetworkingJoinFormCopy,
  NetworkingJoinFormFields,
  NetworkingJoinFormMode,
  NetworkingPlayerTab,
} from "@meyouquize/shared";
import { AdminGeneralSection } from "../../components/admin/AdminGeneralSection";

import type { PublicViewSetPatch } from "../../publicViewContract";

export type AdminEventGeneralTabProps = {
  editableTitle: string;
  setEditableTitle: (value: string) => void;
  saveQuizTitle: () => void | Promise<void>;
  eventSlug: string;
  showEventTitleOnPlayer: boolean;
  onToggleShowEventTitleOnPlayer: (next: boolean) => void;
  playerAutoJoinRandomNickname: boolean;
  onTogglePlayerAutoJoinRandomNickname: (next: boolean) => void;
  networkingEnabled: boolean;
  onNetworkingEnabledChange: (enabled: boolean) => void;
  networkingJoinFormMode: NetworkingJoinFormMode;
  onNetworkingJoinFormModeChange: (mode: NetworkingJoinFormMode) => void;
  networkingJoinFormFields: NetworkingJoinFormFields;
  onNetworkingJoinFormFieldsChange: (fields: NetworkingJoinFormFields) => void;
  networkingJoinFormCopy: NetworkingJoinFormCopy;
  onNetworkingJoinFormCopyChange: (copy: NetworkingJoinFormCopy) => void;
  networkingDefaultTab: NetworkingPlayerTab;
  onNetworkingDefaultTabChange: (tab: NetworkingPlayerTab) => void;
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorBrowserZoom: number;
  setProjectorBrowserZoom: (value: number) => void;
  projectorContentMaxWidthPx: number;
  setProjectorContentMaxWidthPx: (value: number) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
};

export function AdminEventGeneralTab(props: AdminEventGeneralTabProps) {
  return (
    <Stack spacing={2}>
      <AdminGeneralSection {...props} />
    </Stack>
  );
}
