import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Outlet } from "react-router-dom";
import { useBodyBrandBackground } from "../../hooks/useBodyBrandBackground";

const ADMIN_LINK_COLOR = "#ffffff";

/** Корневой контейнер глобальной админки: чёрный фон и белые ссылки. */
export const adminSectionRootSx: SxProps<Theme> = {
  minHeight: "100vh",
  "& a, & .MuiLink-root": {
    color: ADMIN_LINK_COLOR,
    textDecorationColor: "rgba(255, 255, 255, 0.4)",
    "&:hover": {
      color: ADMIN_LINK_COLOR,
      textDecorationColor: ADMIN_LINK_COLOR,
    },
    "&:visited": {
      color: ADMIN_LINK_COLOR,
    },
  },
};

export function AdminSectionLayout() {
  useBodyBrandBackground({ backgroundColor: "#000000" });

  return (
    <Box sx={adminSectionRootSx}>
      <Outlet />
    </Box>
  );
}
