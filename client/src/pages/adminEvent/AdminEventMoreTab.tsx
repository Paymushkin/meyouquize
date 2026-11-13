import { Link as RouterLink } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { buildAdminMoreLinks } from "../../components/admin/AdminMoreLinksPanel";
import type { AdminEventDangerTabProps } from "./AdminEventDangerTab";

export type AdminEventMoreTabProps = AdminEventDangerTabProps;

export function AdminEventMoreTab({
  eventName,
  onResetAllAnswers,
  onRequestResetDemo,
}: AdminEventMoreTabProps) {
  const links = buildAdminMoreLinks(eventName);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Дополнительные страницы админки
        </Typography>
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          {links.map((item) => (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              sx={{
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                alignItems: "flex-start",
                py: 1.25,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.title}
                secondary={item.description}
                primaryTypographyProps={{ variant: "subtitle1" }}
                secondaryTypographyProps={{ variant: "body2" }}
              />
            </ListItemButton>
          ))}
        </Stack>

        <Typography variant="h6" color="error" gutterBottom>
          Опасные действия
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button onClick={() => void onResetAllAnswers()} color="warning" variant="contained">
            Обнулить все ответы
          </Button>
          {eventName === "demo" ? (
            <Button onClick={onRequestResetDemo} color="warning" variant="outlined">
              Вернуть тестовые данные
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
