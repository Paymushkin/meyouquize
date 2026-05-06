import { useEffect } from "react";
import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { brandTheme } from "../../theme/brandTheme";

const BODY_CLASS = "mq-brand-bg";

interface BrandPageLayoutProps {
  children: React.ReactNode;
  documentTitle?: string;
}

export function BrandPageLayout({ children, documentTitle }: BrandPageLayoutProps) {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

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
