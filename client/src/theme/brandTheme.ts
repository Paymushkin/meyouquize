import { createTheme } from "@mui/material";

export const BRAND_BG = "#000000";
export const BRAND_ACCENT = "#FDD32A";
export const BRAND_TEXT = "#ffffff";
export const BRAND_TEXT_MUTED = "rgba(255,255,255,0.72)";
export const BRAND_SURFACE = "rgba(255,255,255,0.04)";
export const BRAND_BORDER = "rgba(255,255,255,0.12)";

export const brandTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: BRAND_ACCENT,
      contrastText: "#000000",
    },
    secondary: {
      main: "#ffffff",
      contrastText: "#000000",
    },
    background: {
      default: BRAND_BG,
      paper: "#0a0a0a",
    },
    text: {
      primary: BRAND_TEXT,
      secondary: BRAND_TEXT_MUTED,
    },
    divider: BRAND_BORDER,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 24,
          paddingBlock: 10,
        },
        containedPrimary: {
          color: "#000000",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 8px 24px rgba(253,211,42,0.35)",
          },
        },
        outlinedPrimary: {
          borderColor: BRAND_ACCENT,
          color: BRAND_ACCENT,
          "&:hover": {
            borderColor: BRAND_ACCENT,
            background: "rgba(253,211,42,0.08)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
