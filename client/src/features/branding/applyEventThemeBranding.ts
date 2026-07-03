import type { EventThemeBranding } from "@meyouquize/shared";
import { pickEventThemeBrandingFromPublicView } from "@meyouquize/shared";
import type { PublicViewPayload } from "../../publicViewContract";
import type { AdminBrandingVisualSetters } from "../admin/applyAdminBrandingVisualFromPublicView";
import {
  applyAdminBrandingVisualFromPublicView,
  type AdminBrandingQrSetters,
  type AdminBrandingTileSetters,
} from "../admin/applyAdminBrandingVisualFromPublicView";

export type BrandingEditorSetters = AdminBrandingVisualSetters &
  AdminBrandingQrSetters &
  AdminBrandingTileSetters;

export function applyEventThemeBrandingToSetters(
  branding: EventThemeBranding,
  setters: BrandingEditorSetters,
): void {
  applyAdminBrandingVisualFromPublicView(branding as PublicViewPayload, setters, {
    qrSetters: setters,
    tileSetters: setters,
  });
}

export function applyEventThemeBrandingFromPublicView(
  pv: PublicViewPayload,
  setters: BrandingEditorSetters,
): EventThemeBranding {
  const branding = pickEventThemeBrandingFromPublicView(pv);
  applyEventThemeBrandingToSetters(branding, setters);
  return branding;
}

export function brandingEditorStateToEventThemeBranding(state: {
  projectorBackground: string;
  cloudQuestionColor: string;
  cloudTagColors: string[];
  cloudTopTagColor: string;
  cloudCorrectTagColor: string;
  cloudDensity: number;
  cloudTagPadding: number;
  cloudSpiral: "archimedean" | "rectangular";
  cloudAnimationStrength: number;
  voteQuestionTextColor: string;
  voteOptionTextColor: string;
  voteOptionBorderColor: string;
  voteProgressTrackColor: string;
  voteProgressBarColor: string;
  playerVoteOptionTextColor: string;
  playerVoteProgressTrackColor: string;
  playerVoteProgressBarColor: string;
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandInputTextColor: string;
  brandFontFamily: string;
  brandFontUrl: string;
  brandFontUrls: string[];
  brandLogoUrl: string;
  brandPlayerBackgroundImageUrl: string;
  brandProjectorBackgroundImageUrl: string;
  brandBodyBackgroundColor: string;
  brandTheme: EventThemeBranding["brandTheme"];
  projectorJoinQrVisible: boolean;
  projectorJoinQrText: string;
  projectorJoinQrTextColor: string;
  projectorJoinQrOverlaySizePx: number;
  projectorJoinQrOverlayInsetPx: number;
  projectorJoinQrOverlayCorner: EventThemeBranding["projectorJoinQrOverlayCorner"];
  speakerTileBackgroundColor: string;
  speakerTileTextColor: string;
  programTileBackgroundColor: string;
  programTileTextColor: string;
}): EventThemeBranding {
  return pickEventThemeBrandingFromPublicView(state);
}
