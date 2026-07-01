import { Card, CardContent, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { AdminSection } from "../../features/admin/adminUiPersistence";
import { ADMIN_EVENT_NAV } from "./adminEventNavConfig";

export type AdminEventNavSidebarProps = {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
};

export function AdminEventNavSidebar({
  activeSection,
  onSectionChange,
}: AdminEventNavSidebarProps) {
  return (
    <Card
      variant="outlined"
      component="nav"
      aria-label="Разделы админки"
      sx={{
        width: { xs: 72, md: 256 },
        flexShrink: 0,
        alignSelf: "flex-start",
        position: "sticky",
        top: 0,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      <CardContent
        sx={{
          px: { xs: 0.25, md: 1.5 },
          py: { xs: 1, md: 2 },
          "&:last-child": { pb: { xs: 1, md: 2 } },
        }}
      >
        <List dense sx={{ py: 0, display: "block" }}>
          {ADMIN_EVENT_NAV.map(({ id, label, icon }) => (
            <ListItemButton
              key={id}
              selected={activeSection === id}
              onClick={() => onSectionChange(id)}
              aria-label={label}
              sx={{
                minWidth: 0,
                justifyContent: { xs: "center", md: "flex-start" },
                borderRadius: 1,
                py: { xs: 1.25, md: 1 },
                px: { xs: 0.5, md: 1.25 },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: { xs: 0, md: 40 },
                  mr: { xs: 0, md: 0 },
                  justifyContent: "center",
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: activeSection === id ? 600 : 400,
                }}
                sx={{
                  display: { xs: "none", md: "block" },
                  m: 0,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
