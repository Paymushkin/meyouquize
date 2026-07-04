import type { ComponentProps } from "react";
import { AdminBrandingSection } from "../../components/admin/AdminBrandingSection";
import type { AdminSection } from "../../features/admin/adminUiPersistence";
import { AdminEventBannersTab, type AdminEventBannersTabProps } from "./AdminEventBannersTab";
import { AdminEventDangerTab, type AdminEventDangerTabProps } from "./AdminEventDangerTab";
import { AdminEventGeneralTab, type AdminEventGeneralTabProps } from "./AdminEventGeneralTab";
import { AdminEventPhotoWallTab, type AdminEventPhotoWallTabProps } from "./AdminEventPhotoWallTab";
import { AdminEventQuestionsTab, type AdminEventQuestionsTabProps } from "./AdminEventQuestionsTab";
import { AdminEventReportTab } from "./AdminEventReportTab";
import { AdminEventResultsTab, type AdminEventResultsTabProps } from "./AdminEventResultsTab";
import { AdminEventSpeakersTab, type AdminEventSpeakersTabProps } from "./AdminEventSpeakersTab";

export type AdminEventSectionRouterProps = {
  activeSection: AdminSection;
  general: AdminEventGeneralTabProps;
  questions: AdminEventQuestionsTabProps;
  speakers: AdminEventSpeakersTabProps;
  banners: AdminEventBannersTabProps;
  photoWall: AdminEventPhotoWallTabProps;
  branding: ComponentProps<typeof AdminBrandingSection>;
  results: AdminEventResultsTabProps;
  report: ComponentProps<typeof AdminEventReportTab>;
  danger: AdminEventDangerTabProps;
};

export function AdminEventSectionRouter({
  activeSection,
  general,
  questions,
  speakers,
  banners,
  photoWall,
  branding,
  results,
  report,
  danger,
}: AdminEventSectionRouterProps) {
  switch (activeSection) {
    case "general":
      return <AdminEventGeneralTab {...general} />;
    case "questions":
      return <AdminEventQuestionsTab {...questions} />;
    case "speakers":
      return <AdminEventSpeakersTab {...speakers} />;
    case "banners":
      return <AdminEventBannersTab {...banners} />;
    case "photo_wall":
      return <AdminEventPhotoWallTab {...photoWall} />;
    case "branding":
      return <AdminBrandingSection {...branding} />;
    case "results":
      return <AdminEventResultsTab {...results} />;
    case "report":
      return <AdminEventReportTab {...report} />;
    case "danger":
      return <AdminEventDangerTab {...danger} />;
    default:
      return null;
  }
}
