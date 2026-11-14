import { Box, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BrandPageLayout } from "../brand/BrandPageLayout";
import { BrandHeader } from "../brand/BrandHeader";
import { BrandFooter } from "../brand/BrandFooter";
import { BRAND_BORDER, BRAND_DISPLAY_FONT, BRAND_TEXT_MUTED } from "../../theme/brandTheme";
import {
  LANDING_CONTAINER_SX,
  LANDING_CONTACT_EMAIL,
  LANDING_CONTACT_PHONE_TEL,
  lt,
} from "./landingConstants";
import { LandingCookieBanner } from "./LandingCookieBanner";
import { DocumentSeo } from "./DocumentSeo";
import { buildOrganizationJsonLd } from "./landingSeo";
import agentSiteContent from "./agentSiteContent.json";

type TrustKind = "about" | "contact";

const PAGES = {
  about: agentSiteContent.about,
  contact: agentSiteContent.contact,
} as const;

export function LandingTrustPage({ kind }: { kind: TrustKind }) {
  const page = PAGES[kind];
  const path = kind === "about" ? "/about" : "/contact";

  return (
    <BrandPageLayout>
      <DocumentSeo
        title={page.documentTitle}
        description={page.description}
        path={path}
        jsonLd={buildOrganizationJsonLd()}
      />
      <BrandHeader showDemoButton={kind === "contact"} />
      <Box
        component="main"
        id="trust-page"
        sx={{
          flex: 1,
          py: { xs: 6, md: 9 },
          borderTop: `1px solid ${BRAND_BORDER}`,
        }}
      >
        <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
          <Stack spacing={3.5} sx={{ maxWidth: 760 }}>
            <MuiLink
              component={RouterLink}
              to="/"
              underline="hover"
              sx={{ color: BRAND_TEXT_MUTED, fontSize: 14, width: "fit-content" }}
            >
              {lt("← На главную МИЮ")}
            </MuiLink>
            <Typography
              component="h1"
              sx={{
                fontFamily: BRAND_DISPLAY_FONT,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: { xs: "2rem", md: "2.75rem" },
                lineHeight: 1.05,
              }}
            >
              {lt(page.h1)}
            </Typography>
            {page.sections.map((section) => (
              <Stack key={section.heading} spacing={1}>
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: { xs: "1.05rem", md: "1.15rem" },
                    letterSpacing: "-0.02em",
                  }}
                >
                  {lt(section.heading)}
                </Typography>
                <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.65 }}>
                  {lt(section.body)}
                </Typography>
              </Stack>
            ))}
            {kind === "contact" ? (
              <Stack spacing={1} sx={{ pt: 1, borderTop: `1px solid ${BRAND_BORDER}` }}>
                <MuiLink
                  href={`mailto:${LANDING_CONTACT_EMAIL}`}
                  underline="hover"
                  sx={{ width: "fit-content" }}
                >
                  {LANDING_CONTACT_EMAIL}
                </MuiLink>
                <MuiLink
                  href={LANDING_CONTACT_PHONE_TEL}
                  underline="hover"
                  sx={{ width: "fit-content" }}
                >
                  {lt("+7 917 536-57-15")}
                </MuiLink>
              </Stack>
            ) : (
              <MuiLink
                component={RouterLink}
                to="/contact"
                underline="hover"
                sx={{ width: "fit-content", fontWeight: 600 }}
              >
                {lt("Перейти к контактам →")}
              </MuiLink>
            )}
          </Stack>
        </Container>
      </Box>
      <BrandFooter />
      <LandingCookieBanner />
    </BrandPageLayout>
  );
}

export function LandingAboutPage() {
  return <LandingTrustPage kind="about" />;
}

export function LandingContactPage() {
  return <LandingTrustPage kind="contact" />;
}
