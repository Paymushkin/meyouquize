import type { ReactNode } from "react";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import DescriptionIcon from "@mui/icons-material/Description";
import InsightsIcon from "@mui/icons-material/Insights";
import QuizIcon from "@mui/icons-material/Quiz";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import ViewCarouselIcon from "@mui/icons-material/ViewCarousel";
import type { AdminSection } from "../../features/admin/adminUiPersistence";

export type AdminEventNavItem = {
  id: AdminSection;
  label: string;
  icon: ReactNode;
};

export const ADMIN_EVENT_NAV: AdminEventNavItem[] = [
  { id: "general", label: "Общее", icon: <SettingsSuggestIcon fontSize="small" /> },
  { id: "questions", label: "Вопросы", icon: <QuizIcon fontSize="small" /> },
  { id: "speakers", label: "Спикеры", icon: <RecordVoiceOverIcon fontSize="small" /> },
  { id: "banners", label: "Баннеры", icon: <ViewCarouselIcon fontSize="small" /> },
  { id: "photo_wall", label: "Фотостена", icon: <PhotoLibraryIcon fontSize="small" /> },
  { id: "results", label: "Результаты", icon: <InsightsIcon fontSize="small" /> },
  { id: "report", label: "Отчет", icon: <DescriptionIcon fontSize="small" /> },
  { id: "branding", label: "Брендирование", icon: <BrandingWatermarkIcon fontSize="small" /> },
  { id: "danger", label: "Опасные", icon: <ReportProblemIcon fontSize="small" /> },
];
