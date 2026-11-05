import { Box } from "@mui/material";
import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { BrandFooter } from "./brand/BrandFooter";
import { LandingHeroSection } from "./landing/LandingHeroSection";
import { LandingPillarsSection } from "./landing/LandingPillarsSection";
import { LandingHowItWorksSection } from "./landing/LandingHowItWorksSection";
import { LandingOnSiteSection } from "./landing/LandingOnSiteSection";
import { LandingProofSection } from "./landing/LandingProofSection";
import { LandingScenariosSection } from "./landing/LandingScenariosSection";
import { LandingFlashInterviewSection } from "./landing/LandingFlashInterviewSection";
import { LandingSocialProofSection } from "./landing/LandingSocialProofSection";
import { FAQ_ITEMS, LandingFaqSection } from "./landing/LandingFaqSection";
import { LandingFinalCtaSection } from "./landing/LandingFinalCtaSection";
import { LandingCookieBanner } from "./landing/LandingCookieBanner";
import { DocumentSeo } from "./landing/DocumentSeo";
import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildServiceJsonLd,
  buildWebsiteJsonLd,
  LANDING_SEO,
} from "./landing/landingSeo";

export function LandingPage() {
  return (
    <BrandPageLayout>
      <DocumentSeo
        title={LANDING_SEO.title}
        description={LANDING_SEO.description}
        path="/"
        jsonLd={[
          buildOrganizationJsonLd(),
          buildWebsiteJsonLd(),
          buildServiceJsonLd(),
          buildFaqJsonLd(FAQ_ITEMS),
        ]}
      />
      <Box sx={{ position: "relative" }}>
        <BrandHeader overHero />
        <LandingHeroSection />
      </Box>
      <LandingPillarsSection />
      <LandingHowItWorksSection />
      <LandingOnSiteSection />
      <LandingProofSection />
      <LandingScenariosSection />
      <LandingFlashInterviewSection />
      <LandingSocialProofSection />
      <LandingFaqSection />
      <LandingFinalCtaSection />
      <BrandFooter />
      <LandingCookieBanner />
    </BrandPageLayout>
  );
}
