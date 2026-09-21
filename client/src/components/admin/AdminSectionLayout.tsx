import { Box, CssBaseline } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Outlet } from "react-router-dom";
import { useBodyBrandBackground } from "../../hooks/useBodyBrandBackground";
import { AdminColorModeProvider, useAdminColorMode } from "../../theme/AdminColorModeProvider";
import type { AdminColorMode } from "../../theme/adminColorMode";

export function buildAdminSectionRootSx(mode: AdminColorMode): SxProps<Theme> {
  const linkColor = mode === "light" ? "inherit" : "#ffffff";
  return {
    minHeight: "100vh",
    bgcolor: "background.default",
    color: "text.primary",
    "& a, & .MuiLink-root": {
      color: linkColor,
      textDecorationColor: mode === "light" ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.4)",
      "&:hover": {
        color: linkColor,
        textDecorationColor: linkColor,
      },
      "&:visited": {
        color: linkColor,
      },
    },
  };
}

function AdminSectionLayoutInner() {
  const { mode } = useAdminColorMode();
  useBodyBrandBackground({
    backgroundColor: mode === "light" ? "#f4f5f7" : "#121212",
  });

  return (
    <Box sx={buildAdminSectionRootSx(mode)} data-admin-color-mode={mode}>
      <CssBaseline />
      <Outlet />
    </Box>
  );
}

/** Корневой контейнер глобальной админки со светлой/тёмной темой UI. */
export function AdminSectionLayout() {
  return (
    <AdminColorModeProvider>
      <AdminSectionLayoutInner />
    </AdminColorModeProvider>
  );
}
