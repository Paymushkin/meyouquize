import ForumIcon from "@mui/icons-material/Forum";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import { Box, Stack, Typography } from "@mui/material";
import type { PublicViewState } from "@meyouquize/shared";
import type { SvgIconComponent } from "@mui/icons-material";

type Props = {
  view: PublicViewState;
};

function ruPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

const ITEMS: Array<{
  key: "messages" | "guests" | "acquaintances";
  Icon: SvgIconComponent;
  label: (n: number) => string;
}> = [
  {
    key: "messages",
    Icon: ForumIcon,
    label: (n) => ruPlural(n, "СООБЩЕНИЕ", "СООБЩЕНИЯ", "СООБЩЕНИЙ"),
  },
  {
    key: "guests",
    Icon: PeopleIcon,
    label: (n) => ruPlural(n, "ВИЗИТКА", "ВИЗИТКИ", "ВИЗИТОК"),
  },
  {
    key: "acquaintances",
    Icon: PersonAddAlt1Icon,
    label: (n) => ruPlural(n, "ЗНАКОМСТВО", "ЗНАКОМСТВА", "ЗНАКОМСТВ"),
  },
];

export function ProjectorNetworkingStatsSection({ view }: Props) {
  const stats = view.networkingStats ?? { messages: 0, guests: 0, acquaintances: 0 };
  const textColor = view.voteOptionTextColor || "#fff";
  const accent =
    view.networkingProjectorIconColor ||
    view.brandPrimaryColor ||
    view.brandAccentColor ||
    "#F0B429";

  return (
    <Stack
      sx={{
        height: "100%",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, md: 3 },
        boxSizing: "border-box",
      }}
    >
      <Stack
        direction="row"
        flexWrap="nowrap"
        spacing={{ xs: 1.5, sm: 3, md: 6 }}
        sx={{
          width: "100%",
          maxWidth: 1280,
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 1.5, sm: 3, md: 5 },
          py: { xs: 2, md: 4 },
          bgcolor: "rgba(0,0,0,0.3)",
          borderRadius: 1.5,
          overflow: "hidden",
        }}
      >
        {ITEMS.map(({ key, Icon, label }) => {
          const value = stats[key];
          return (
            <Box
              key={key}
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: { xs: 0.75, md: 2 },
              }}
            >
              <Box
                sx={{
                  width: "clamp(2.75rem, 9vw, 8.75rem)",
                  height: "clamp(2.75rem, 9vw, 8.75rem)",
                  display: "grid",
                  placeItems: "center",
                  color: accent,
                  flexShrink: 1,
                  "& > svg": {
                    width: "100%",
                    height: "100%",
                    display: "block",
                  },
                }}
              >
                <Icon />
              </Box>
              <Typography
                sx={{
                  color: textColor,
                  fontWeight: 800,
                  fontSize: "clamp(1.75rem, 7vw, 7rem)",
                  lineHeight: 1,
                  fontFamily: view.brandFontFamily,
                  letterSpacing: "-0.02em",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {value}
              </Typography>
              <Typography
                sx={{
                  color: textColor,
                  fontWeight: 700,
                  fontSize: "clamp(0.65rem, 1.6vw, 1.45rem)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: view.brandFontFamily,
                  opacity: 0.95,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {label(value)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
