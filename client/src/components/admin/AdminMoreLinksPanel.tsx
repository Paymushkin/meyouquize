import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";

export type AdminMoreLink = {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export function buildAdminMoreLinks(eventSlug: string): AdminMoreLink[] {
  const base = `/admin/${encodeURIComponent(eventSlug)}`;
  return [
    {
      to: `${base}/guests`,
      title: "Гости",
      description: "Участники нетворкинга: профили, каталог, чаты и сообщения",
      icon: <GroupsIcon color="primary" />,
    },
    {
      to: `${base}/results`,
      title: "Результаты",
      description: "Таблицы баллов пользователей по квизам ивента",
      icon: <InsightsIcon color="primary" />,
    },
  ];
}

type Props = {
  eventSlug: string;
  /** Краткий подзаголовок над списком. */
  subtitle?: string;
};

export function AdminMoreLinksPanel({ eventSlug, subtitle }: Props) {
  const links = buildAdminMoreLinks(eventSlug);
  return (
    <Stack spacing={1.5}>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
      {links.map((item) => (
        <Card key={item.to} variant="outlined">
          <CardActionArea component={RouterLink} to={item.to}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                {item.icon}
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Stack>
  );
}
