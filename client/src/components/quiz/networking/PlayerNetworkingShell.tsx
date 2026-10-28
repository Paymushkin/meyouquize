import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HomeIcon from "@mui/icons-material/Home";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleIcon from "@mui/icons-material/People";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { Badge, Box, ButtonBase, Typography } from "@mui/material";
import type { NetworkingPlayerTab } from "@meyouquize/shared";
import { DEFAULT_NETWORKING_PLAYER_TAB } from "@meyouquize/shared";
import type { ReactNode } from "react";

export type PlayerNetworkingTab = NetworkingPlayerTab;

function networkingTabStorageKey(slug: string): string {
  return `mq:networking:tab:${slug}`;
}

export function readStoredNetworkingTab(
  slug: string,
  fallback: PlayerNetworkingTab = DEFAULT_NETWORKING_PLAYER_TAB,
): PlayerNetworkingTab {
  if (!slug) return fallback;
  try {
    const value = localStorage.getItem(networkingTabStorageKey(slug));
    if (value === "feed" || value === "guests" || value === "chats") return value;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function storeNetworkingTab(slug: string, tab: PlayerNetworkingTab): void {
  if (!slug) return;
  try {
    localStorage.setItem(networkingTabStorageKey(slug), tab);
  } catch {
    /* ignore */
  }
}

const BAR_HEIGHT = 56;
const NAV_BG = "#111111";
export const NETWORKING_NAV_TOTAL_HEIGHT = BAR_HEIGHT;

const TABS: {
  value: PlayerNetworkingTab;
  label: string;
  icon: ReactNode;
  iconActive: ReactNode;
}[] = [
  {
    value: "feed",
    label: "Лента",
    icon: <HomeOutlinedIcon />,
    iconActive: <HomeIcon />,
  },
  {
    value: "guests",
    label: "Гости",
    icon: <PeopleOutlineIcon />,
    iconActive: <PeopleIcon />,
  },
  {
    value: "chats",
    label: "Чаты",
    icon: <ChatBubbleOutlineIcon />,
    iconActive: <ChatBubbleIcon />,
  },
];

type Props = {
  tab: PlayerNetworkingTab;
  onTabChange: (tab: PlayerNetworkingTab) => void;
  unreadTotal: number;
  /** Яркий цвет иконок (акцент бренда). */
  buttonBackgroundColor: string;
  /** @deprecated подписи берутся от акцента; оставлен для совместимости. */
  buttonTextColor: string;
  /** Скрыть нижнее меню (например, в открытом диалоге). */
  hideNav?: boolean;
  children: ReactNode;
};

export function PlayerNetworkingShell({
  tab,
  onTabChange,
  unreadTotal,
  buttonBackgroundColor,
  hideNav = false,
  children,
}: Props) {
  const accent = buttonBackgroundColor;

  return (
    <Box
      sx={{
        // Единственный запас под fixed-меню (container pb при networking обнуляем).
        pb: hideNav
          ? 0
          : `calc(${NETWORKING_NAV_TOTAL_HEIGHT + 8}px + env(safe-area-inset-bottom, 0px))`,
        position: "relative",
      }}
    >
      {/*
        Белый фон списка чатов — fixed full-bleed (как меню), не minHeight внутри
        Container с px: иначе Safari рисует «карточку» с щелями бренда по бокам.
      */}
      {tab === "chats" && !hideNav ? (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 576,
            bgcolor: "#ffffff",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>

      {hideNav ? null : (
        <Box
          sx={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: "100%",
            maxWidth: 576,
            zIndex: 20,
            height: BAR_HEIGHT,
            bgcolor: NAV_BG,
            display: "flex",
          }}
        >
          {TABS.map((item) => {
            const selected = tab === item.value;
            const rawIcon = selected ? item.iconActive : item.icon;
            const iconNode =
              item.value === "chats" ? (
                <Badge
                  color="error"
                  badgeContent={unreadTotal}
                  max={99}
                  invisible={unreadTotal <= 0}
                  overlap="circular"
                  sx={{
                    "& .MuiBadge-badge": {
                      bgcolor: "#ff3b30",
                      color: "#fff",
                      fontWeight: 700,
                      minWidth: 18,
                      height: 18,
                      fontSize: "0.65rem",
                    },
                  }}
                >
                  {rawIcon}
                </Badge>
              ) : (
                rawIcon
              );

            return (
              <ButtonBase
                key={item.value}
                onClick={() => onTabChange(item.value)}
                aria-label={item.label}
                aria-current={selected ? "page" : undefined}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.25,
                  color: accent,
                  opacity: selected ? 1 : 0.5,
                  minWidth: 0,
                  "&:hover": { opacity: 1 },
                  "& .MuiSvgIcon-root": {
                    fontSize: selected ? 26 : 22,
                    color: accent,
                  },
                }}
              >
                {iconNode}
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.7rem",
                    lineHeight: 1.1,
                    fontWeight: selected ? 700 : 500,
                    color: accent,
                    textTransform: "none",
                  }}
                >
                  {item.label}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
