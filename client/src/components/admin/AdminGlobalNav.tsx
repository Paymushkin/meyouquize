import { Stack, Tab, Tabs } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

function resolveAdminTab(pathname: string): "rooms" | "themes" | "fonts" | "admins" {
  if (pathname.startsWith("/admin/admins")) return "admins";
  if (pathname.startsWith("/admin/themes")) return "themes";
  if (pathname.startsWith("/admin/fonts")) return "fonts";
  return "rooms";
}

export function AdminGlobalNav({ canManageAdmins = false }: { canManageAdmins?: boolean }) {
  const location = useLocation();
  const tab = resolveAdminTab(location.pathname);

  return (
    <Stack sx={{ mb: 2 }}>
      <Tabs value={tab}>
        <Tab label="Комнаты" value="rooms" component={Link} to="/admin" />
        <Tab label="Темы" value="themes" component={Link} to="/admin/themes" />
        <Tab label="Шрифты" value="fonts" component={Link} to="/admin/fonts" />
        {canManageAdmins ? (
          <Tab label="Админы" value="admins" component={Link} to="/admin/admins" />
        ) : null}
      </Tabs>
    </Stack>
  );
}
