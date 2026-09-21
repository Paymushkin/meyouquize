import { createTheme, type Theme } from "@mui/material/styles";
import type { AdminColorMode } from "./adminColorMode";

const shared = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Jost, Arial, sans-serif",
  },
} as const;

export function createAdminAppTheme(mode: AdminColorMode): Theme {
  if (mode === "light") {
    return createTheme({
      ...shared,
      palette: {
        mode: "light",
        primary: { main: "#7c5acb" },
        secondary: { main: "#5a6b78" },
        background: {
          default: "#f4f5f7",
          paper: "#ffffff",
        },
        text: {
          primary: "#1a1d21",
          secondary: "rgba(26, 29, 33, 0.72)",
        },
        divider: "rgba(0, 0, 0, 0.12)",
      },
    });
  }

  return createTheme({
    ...shared,
    palette: {
      mode: "dark",
      primary: { main: "#7c5acb" },
      secondary: { main: "#22313c" },
      background: {
        default: "#121212",
        paper: "#22313c",
      },
      text: {
        primary: "#ffffff",
        secondary: "rgba(255, 255, 255, 0.72)",
      },
      divider: "rgba(255, 255, 255, 0.12)",
    },
  });
}
