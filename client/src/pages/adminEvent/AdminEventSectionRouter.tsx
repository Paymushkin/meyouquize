import type { ComponentProps } from "react";
import { AdminBrandingSection } from "../../components/admin/AdminBrandingSection";
import { AdminProjectorTimelineSection } from "../../components/admin/AdminProjectorTimelineSection";
import type { useAdminProjectorTimeline } from "../../features/admin/useAdminProjectorTimeline";
import type { AdminSection } from "../../features/admin/adminUiPersistence";
import { AdminEventBannersTab, type AdminEventBannersTabProps } from "./AdminEventBannersTab";
import { AdminEventGeneralTab, type AdminEventGeneralTabProps } from "./AdminEventGeneralTab";
import { AdminEventMoreTab, type AdminEventMoreTabProps } from "./AdminEventMoreTab";
import { AdminEventPhotoWallTab, type AdminEventPhotoWallTabProps } from "./AdminEventPhotoWallTab";
import { AdminEventQuestionsTab, type AdminEventQuestionsTabProps } from "./AdminEventQuestionsTab";
import { AdminEventReportTab } from "./AdminEventReportTab";
import { AdminEventSpeakersTab, type AdminEventSpeakersTabProps } from "./AdminEventSpeakersTab";
import { AdminEventVideoWallTab, type AdminEventVideoWallTabProps } from "./AdminEventVideoWallTab";

export type AdminEventProjectorTabProps = {
  timeline: ReturnType<typeof useAdminProjectorTimeline>;
  photoWallAvailable: boolean;
  videoWallAvailable: boolean;
};

export type AdminEventSectionRouterProps = {
  activeSection: AdminSection;
  general: AdminEventGeneralTabProps;
  projector: AdminEventProjectorTabProps;
  questions: AdminEventQuestionsTabProps;
  speakers: AdminEventSpeakersTabProps;
  banners: AdminEventBannersTabProps;
  photoWall: AdminEventPhotoWallTabProps;
  videoWall: AdminEventVideoWallTabProps;
  more: AdminEventMoreTabProps;
  branding: ComponentProps<typeof AdminBrandingSection>;
  report: ComponentProps<typeof AdminEventReportTab>;
};

export function AdminEventSectionRouter({
  activeSection,
  general,
  projector,
  questions,
  speakers,
  banners,
  photoWall,
  videoWall,
  more,
  branding,
  report,
}: AdminEventSectionRouterProps) {
  switch (activeSection) {
    case "general":
      return <AdminEventGeneralTab {...general} />;
    case "projector": {
      const { timeline, photoWallAvailable, videoWallAvailable } = projector;
      return (
        <AdminProjectorTimelineSection
          timeline={timeline.timeline}
          photoWallAvailable={photoWallAvailable}
          videoWallAvailable={videoWallAvailable}
          onAddStep={() => timeline.addStep()}
          onUpdateStep={timeline.updateStep}
          onRemoveStep={timeline.removeStep}
          onMoveStep={timeline.moveStep}
          onFreezeStep={timeline.freezeStep}
        />
      );
    }
    case "questions":
      return <AdminEventQuestionsTab {...questions} />;
    case "speakers":
      return <AdminEventSpeakersTab {...speakers} />;
    case "banners":
      return <AdminEventBannersTab {...banners} />;
    case "photo_wall":
      return <AdminEventPhotoWallTab {...photoWall} />;
    case "video_wall":
      return <AdminEventVideoWallTab {...videoWall} />;
    case "more":
      return <AdminEventMoreTab {...more} />;
    case "branding":
      return <AdminBrandingSection {...branding} />;
    case "report":
      return <AdminEventReportTab {...report} />;
    default:
      return null;
  }
}
