import { useEffect } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { brandTheme } from "../../theme/brandTheme";
import { useBodyBrandBackground } from "../../hooks/useBodyBrandBackground";
import { LandingContactProvider } from "../landing/LandingContactDialog";

interface BrandPageLayoutProps {
  children: React.ReactNode;
  documentTitle?: string;
}

export function BrandPageLayout({ children, documentTitle }: BrandPageLayoutProps) {
  useBodyBrandBackground({ backgroundColor: "#000000" });
  useEffect(() => {
    if (!documentTitle) return;
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <ThemeProvider theme={brandTheme}>
      <CssBaseline />
      <LandingContactProvider>
        <Box
          sx={{
            minHeight: "100vh",
            width: "100%",
            maxWidth: "100%",
            overflowX: "hidden",
            bgcolor: "background.default",
            color: "text.primary",
            fontFamily: '"Manrope", "Helvetica Neue", sans-serif',
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </Box>
      </LandingContactProvider>
    </ThemeProvider>
  );
}
