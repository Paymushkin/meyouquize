import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Button, Container, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { BrandPageLayout } from "../brand/BrandPageLayout";
import { BrandHeader } from "../brand/BrandHeader";
import { BrandFooter } from "../brand/BrandFooter";
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_DISPLAY_FONT,
  BRAND_TEXT_MUTED,
} from "../../theme/brandTheme";
import { LANDING_CONTAINER_SX, lt } from "./landingConstants";
import { LandingCookieBanner } from "./LandingCookieBanner";
import { DocumentSeo } from "./DocumentSeo";
import { LandingFlashInterviewSection } from "./LandingFlashInterviewSection";
import { LandingProofSection } from "./LandingProofSection";
import { buildOrganizationJsonLd, buildServiceJsonLd } from "./landingSeo";
import { useLandingContact } from "./LandingContactDialog";
import { LANDING_MARKETING_PAGES, type LandingMarketingPageId } from "./landingMarketingPages";

export function LandingMarketingPage({ pageId }: { pageId: LandingMarketingPageId }) {
  const page = LANDING_MARKETING_PAGES[pageId];
  const { openContact } = useLandingContact();
  const visualHref = page.visual === "flash" ? "#flash" : "#proof";
  const visualCta = page.visual === "flash" ? lt("Смотреть формат") : lt("Смотреть на экране");

  return (
    <BrandPageLayout>
      <DocumentSeo
        title={page.documentTitle}
        description={page.description}
        path={page.path}
        jsonLd={[buildOrganizationJsonLd(), buildServiceJsonLd()]}
      />
      <BrandHeader />
      <Box
        component="main"
        id="marketing-page"
        sx={{
          flex: 1,
          borderBottom: `1px solid ${BRAND_BORDER}`,
        }}
      >
        <Container
          maxWidth={false}
          sx={{ ...LANDING_CONTAINER_SX, pt: { xs: 4, md: 6 }, pb: { xs: 4, md: 5 } }}
        >
          <Stack spacing={{ xs: 3, md: 3.5 }} sx={{ maxWidth: 820 }}>
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
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontSize: {
                  xs: "clamp(1.75rem, 6vw, 2.4rem)",
                  md: "clamp(2.4rem, 4vw, 3.25rem)",
                },
                lineHeight: 1.1,
                m: 0,
              }}
            >
              {page.h1}
            </Typography>

            <Typography
              sx={{
                color: BRAND_TEXT_MUTED,
                fontSize: { xs: "1.05rem", md: "1.2rem" },
                lineHeight: 1.5,
              }}
            >
              {page.lead}
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
              <Button
                type="button"
                onClick={openContact}
                variant="contained"
                color="primary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderRadius: 0,
                  fontWeight: 700,
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                }}
              >
                {lt("Обсудить мероприятие")}
              </Button>
              <Button
                component="a"
                href={visualHref}
                variant="outlined"
                color="secondary"
                size="large"
                sx={{
                  borderRadius: 0,
                  fontWeight: 700,
                  borderColor: "rgba(255,255,255,0.45)",
                  color: "#fff",
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
                }}
              >
                {visualCta}
              </Button>
            </Stack>
          </Stack>
        </Container>

        {page.visual === "flash" ? <LandingFlashInterviewSection /> : <LandingProofSection />}

        <Container
          maxWidth={false}
          sx={{ ...LANDING_CONTAINER_SX, pt: { xs: 5, md: 7 }, pb: { xs: 6, md: 8 } }}
        >
          <Stack spacing={{ xs: 3, md: 4 }} sx={{ maxWidth: 820 }}>
            {page.sections.map((section) => (
              <Box
                key={section.heading}
                component="section"
                sx={{
                  pt: { xs: 1, md: 1.5 },
                  borderTop: `1px solid ${BRAND_BORDER}`,
                }}
              >
                <Typography
                  component="h2"
                  sx={{
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontSize: { xs: "1.15rem", md: "1.35rem" },
                    mb: 1.25,
                  }}
                >
                  {section.heading}
                </Typography>
                <Typography
                  sx={{
                    color: BRAND_TEXT_MUTED,
                    lineHeight: 1.55,
                    mb: section.items ? 1.25 : 0,
                  }}
                >
                  {section.body}
                </Typography>
                {section.items ? (
                  <Box component="ul" sx={{ m: 0, pl: 2.25, color: "#fff" }}>
                    {section.items.map((item) => (
                      <Box
                        component="li"
                        key={item}
                        sx={{ mb: 0.75, color: BRAND_TEXT_MUTED, lineHeight: 1.45 }}
                      >
                        <Box component="span" sx={{ color: BRAND_ACCENT, mr: 0.75 }}>
                          —
                        </Box>
                        {item}
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            ))}

            <Box sx={{ pt: 1, borderTop: `1px solid ${BRAND_BORDER}` }}>
              <Typography
                component="h2"
                sx={{
                  fontFamily: BRAND_DISPLAY_FONT,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontSize: "1.05rem",
                  mb: 1.25,
                }}
              >
                {lt("Смотрите также")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
                {page.related.map((link) => (
                  <MuiLink
                    key={link.to}
                    component={RouterLink}
                    to={link.to}
                    underline="always"
                    sx={{
                      color: "#fff",
                      fontWeight: 600,
                      textDecorationColor: BRAND_ACCENT,
                      textUnderlineOffset: "0.2em",
                      "&:hover": {
                        color: BRAND_ACCENT,
                        textDecorationColor: BRAND_ACCENT,
                      },
                    }}
                  >
                    {link.label}
                  </MuiLink>
                ))}
              </Stack>
            </Box>

            <Box sx={{ pt: { xs: 1, md: 2 } }}>
              <Button
                type="button"
                onClick={openContact}
                variant="contained"
                color="primary"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ borderRadius: 0, fontWeight: 700 }}
              >
                {lt("Обсудить мероприятие")}
              </Button>
            </Box>
          </Stack>
        </Container>
      </Box>
      <BrandFooter />
      <LandingCookieBanner />
    </BrandPageLayout>
  );
}

export function LandingInteractivesPage() {
  return <LandingMarketingPage pageId="interactives" />;
}
export function LandingFlashInterviewPage() {
  return <LandingMarketingPage pageId="flash-interview" />;
}
export function LandingConferencePage() {
  return <LandingMarketingPage pageId="conference" />;
}
export function LandingCorporatePage() {
  return <LandingMarketingPage pageId="corporate" />;
}
export function LandingPharmaPage() {
  return <LandingMarketingPage pageId="pharma" />;
}
