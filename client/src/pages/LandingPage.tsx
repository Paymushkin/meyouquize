import { lazy, Suspense } from "react";
import { Box } from "@mui/material";
import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { LandingHeroSection } from "./landing/LandingHeroSection";
import { DocumentSeo } from "./landing/DocumentSeo";
import { FAQ_ITEMS } from "./landing/landingFaqData";
import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildServiceJsonLd,
  buildWebsiteJsonLd,
  LANDING_SEO,
} from "./landing/landingSeo";

const LandingPillarsSection = lazy(() =>
  import("./landing/LandingPillarsSection").then((m) => ({ default: m.LandingPillarsSection })),
);
const LandingHowItWorksSection = lazy(() =>
  import("./landing/LandingHowItWorksSection").then((m) => ({
    default: m.LandingHowItWorksSection,
  })),
);
const LandingOnSiteSection = lazy(() =>
  import("./landing/LandingOnSiteSection").then((m) => ({ default: m.LandingOnSiteSection })),
);
const LandingProofSection = lazy(() =>
  import("./landing/LandingProofSection").then((m) => ({ default: m.LandingProofSection })),
);
const LandingScenariosSection = lazy(() =>
  import("./landing/LandingScenariosSection").then((m) => ({
    default: m.LandingScenariosSection,
  })),
);
const LandingFlashInterviewSection = lazy(() =>
  import("./landing/LandingFlashInterviewSection").then((m) => ({
    default: m.LandingFlashInterviewSection,
  })),
);
const LandingSocialProofSection = lazy(() =>
  import("./landing/LandingSocialProofSection").then((m) => ({
    default: m.LandingSocialProofSection,
  })),
);
const LandingFaqSection = lazy(() =>
  import("./landing/LandingFaqSection").then((m) => ({ default: m.LandingFaqSection })),
);
const LandingFinalCtaSection = lazy(() =>
  import("./landing/LandingFinalCtaSection").then((m) => ({
    default: m.LandingFinalCtaSection,
  })),
);
const BrandFooter = lazy(() =>
  import("./brand/BrandFooter").then((m) => ({ default: m.BrandFooter })),
);
const LandingCookieBanner = lazy(() =>
  import("./landing/LandingCookieBanner").then((m) => ({ default: m.LandingCookieBanner })),
);

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
      <Suspense fallback={null}>
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
      </Suspense>
    </BrandPageLayout>
  );
}
