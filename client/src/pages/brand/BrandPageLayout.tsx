import { useEffect } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { brandTheme } from "../../theme/brandTheme";
import { useBodyBrandBackground } from "../../hooks/useBodyBrandBackground";

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
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          fontFamily: "Roboto, sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}
