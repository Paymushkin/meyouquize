import { alpha, createTheme } from "@mui/material/styles";

type Branding = {
  brandPrimaryColor: string;
  brandAccentColor: string;
  brandSurfaceColor: string;
  brandTextColor: string;
  brandFontFamily: string;
  brandBodyBackgroundColor: string;
};

function isDarkHexColor(hex: string): boolean {
  const normalized = hex.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return true;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

export function buildReportTheme(branding: Branding) {
  const bodyBg = branding.brandBodyBackgroundColor?.trim() || "#0f1d2a";
  const textColor = branding.brandTextColor?.trim() || "#ffffff";
  const mode = isDarkHexColor(bodyBg) ? "dark" : "light";

  return createTheme({
    palette: {
      mode,
      primary: { main: branding.brandPrimaryColor?.trim() || "#7c5acb" },
      secondary: { main: branding.brandAccentColor?.trim() || "#1976d2" },
      background: {
        default: bodyBg,
        paper: branding.brandSurfaceColor?.trim() || (mode === "dark" ? "#1a2634" : "#ffffff"),
      },
      text: {
        primary: textColor,
        secondary: alpha(textColor, 0.72),
      },
      divider: alpha(textColor, mode === "dark" ? 0.22 : 0.14),
    },
    typography: {
      fontFamily: branding.brandFontFamily?.trim() || "Roboto, Arial, sans-serif",
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bodyBg,
            color: textColor,
          },
        },
      },
    },
  });
}
