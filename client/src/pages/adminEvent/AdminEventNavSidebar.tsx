import {
  Box,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { AdminColorModeSwitcher } from "../../components/admin/AdminColorModeSwitcher";
import type { AdminSection } from "../../features/admin/adminUiPersistence";
import { ADMIN_EVENT_NAV } from "./adminEventNavConfig";

export type AdminEventNavSidebarProps = {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  /** Красная точка на пункте навигации (например, новые вопросы Q&A). */
  sectionBadges?: Partial<Record<AdminSection, boolean>>;
};

export function AdminEventNavSidebar({
  activeSection,
  onSectionChange,
  sectionBadges,
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
          {ADMIN_EVENT_NAV.map(({ id, label, icon }) => {
            const showBadge = sectionBadges?.[id] === true;
            return (
              <ListItemButton
                key={id}
                selected={activeSection === id}
                onClick={() => onSectionChange(id)}
                aria-label={showBadge ? `${label}, есть новые` : label}
                sx={{
                  position: "relative",
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
                {showBadge ? (
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      right: { xs: 6, md: 10 },
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "error.main",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
              </ListItemButton>
            );
          })}
        </List>
        <AdminColorModeSwitcher />
      </CardContent>
    </Card>
  );
}
