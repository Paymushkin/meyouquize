import { Stack } from "@mui/material";
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
  projectorJoinQrVisible: boolean;
  setProjectorJoinQrVisible: (value: boolean) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
};

export function AdminEventGeneralTab({
  editableTitle,
  setEditableTitle,
  saveQuizTitle,
  eventSlug,
  showEventTitleOnPlayer,
  onToggleShowEventTitleOnPlayer,
  playerAutoJoinRandomNickname,
  onTogglePlayerAutoJoinRandomNickname,
  projectorJoinQrVisible,
  setProjectorJoinQrVisible,
  projectorJoinQrText,
  setProjectorJoinQrText,
  projectorJoinQrTextColor,
  setProjectorJoinQrTextColor,
  emitBrandingPatch,
}: AdminEventGeneralTabProps) {
  return (
    <Stack spacing={2}>
      <AdminGeneralSection
        editableTitle={editableTitle}
        setEditableTitle={setEditableTitle}
        saveQuizTitle={saveQuizTitle}
        eventSlug={eventSlug}
        showEventTitleOnPlayer={showEventTitleOnPlayer}
        onToggleShowEventTitleOnPlayer={onToggleShowEventTitleOnPlayer}
        playerAutoJoinRandomNickname={playerAutoJoinRandomNickname}
        onTogglePlayerAutoJoinRandomNickname={onTogglePlayerAutoJoinRandomNickname}
        projectorJoinQrVisible={projectorJoinQrVisible}
        setProjectorJoinQrVisible={setProjectorJoinQrVisible}
        projectorJoinQrText={projectorJoinQrText}
        setProjectorJoinQrText={setProjectorJoinQrText}
        projectorJoinQrTextColor={projectorJoinQrTextColor}
        setProjectorJoinQrTextColor={setProjectorJoinQrTextColor}
        emitBrandingPatch={emitBrandingPatch}
      />
    </Stack>
  );
}
