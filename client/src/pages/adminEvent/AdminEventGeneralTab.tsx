import { Stack } from "@mui/material";
import { AdminGeneralSection } from "../../components/admin/AdminGeneralSection";
import {
  AdminProjectorTimelineSection,
  type TimelineQuestionOption,
  type TimelineSubQuizOption,
} from "../../components/admin/AdminProjectorTimelineSection";
import type { useAdminProjectorTimeline } from "../../features/admin/useAdminProjectorTimeline";

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
  projectorBrowserZoom: number;
  setProjectorBrowserZoom: (value: number) => void;
  projectorContentMaxWidthPx: number;
  setProjectorContentMaxWidthPx: (value: number) => void;
  projectorJoinQrText: string;
  setProjectorJoinQrText: (value: string) => void;
  projectorJoinQrTextColor: string;
  setProjectorJoinQrTextColor: (value: string) => void;
  emitBrandingPatch: (patch: PublicViewSetPatch) => void;
  timeline: ReturnType<typeof useAdminProjectorTimeline>;
  timelineQuestions: TimelineQuestionOption[];
  timelineSubQuizzes: TimelineSubQuizOption[];
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
  projectorBrowserZoom,
  setProjectorBrowserZoom,
  projectorContentMaxWidthPx,
  setProjectorContentMaxWidthPx,
  projectorJoinQrText,
  setProjectorJoinQrText,
  projectorJoinQrTextColor,
  setProjectorJoinQrTextColor,
  emitBrandingPatch,
  timeline,
  timelineQuestions,
  timelineSubQuizzes,
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
        projectorBrowserZoom={projectorBrowserZoom}
        setProjectorBrowserZoom={setProjectorBrowserZoom}
        projectorContentMaxWidthPx={projectorContentMaxWidthPx}
        setProjectorContentMaxWidthPx={setProjectorContentMaxWidthPx}
        projectorJoinQrText={projectorJoinQrText}
        setProjectorJoinQrText={setProjectorJoinQrText}
        projectorJoinQrTextColor={projectorJoinQrTextColor}
        setProjectorJoinQrTextColor={setProjectorJoinQrTextColor}
        emitBrandingPatch={emitBrandingPatch}
      />
      <AdminProjectorTimelineSection
        timeline={timeline.timeline}
        networkingEnabled={timeline.networkingEnabled}
        onNetworkingEnabledChange={timeline.setNetworkingEnabledRemote}
        questions={timelineQuestions}
        subQuizzes={timelineSubQuizzes}
        onAddStep={() => timeline.addStep()}
        onUpdateStep={timeline.updateStep}
        onRemoveStep={timeline.removeStep}
        onMoveStep={timeline.moveStep}
        onPlay={timeline.play}
        onPause={timeline.pause}
        onSkip={timeline.skip}
        onStop={timeline.stop}
      />
    </Stack>
  );
}
