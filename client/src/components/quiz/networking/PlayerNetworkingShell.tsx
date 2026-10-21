import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { Badge, BottomNavigation, BottomNavigationAction, Box, Paper } from "@mui/material";
import type { ReactNode } from "react";

export type PlayerNetworkingTab = "feed" | "guests" | "chats";

function networkingTabStorageKey(slug: string): string {
  return `mq:networking:tab:${slug}`;
}

export function readStoredNetworkingTab(slug: string): PlayerNetworkingTab {
  if (!slug) return "feed";
  try {
    const value = localStorage.getItem(networkingTabStorageKey(slug));
    if (value === "feed" || value === "guests" || value === "chats") return value;
  } catch {
    /* ignore */
  }
  return "feed";
}

export function storeNetworkingTab(slug: string, tab: PlayerNetworkingTab): void {
  if (!slug) return;
  try {
    localStorage.setItem(networkingTabStorageKey(slug), tab);
  } catch {
    /* ignore */
  }
}

type Props = {
  tab: PlayerNetworkingTab;
  onTabChange: (tab: PlayerNetworkingTab) => void;
  unreadTotal: number;
  /** Фон как у кнопки. */
  buttonBackgroundColor: string;
  /** Иконки и подписи как текст кнопки. */
  buttonTextColor: string;
  children: ReactNode;
};

export function PlayerNetworkingShell({
  tab,
  onTabChange,
  unreadTotal,
  buttonBackgroundColor,
  buttonTextColor,
  children,
}: Props) {
  return (
    <Box
      sx={{
        pb: tab === "guests" ? 0 : 5,
        bgcolor: "transparent",
        ...(tab === "guests"
          ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
          : { minHeight: "100%" }),
      }}
    >
      <Box
        sx={
          tab === "guests"
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
            : undefined
        }
      >
        {children}
      </Box>
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "100%",
          maxWidth: 576,
          zIndex: 20,
          borderRadius: 0,
          bgcolor: buttonBackgroundColor,
        }}
      >
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_, value: PlayerNetworkingTab) => onTabChange(value)}
          sx={{
            bgcolor: buttonBackgroundColor,
            color: buttonTextColor,
            "& .MuiBottomNavigationAction-root": {
              color: buttonTextColor,
              opacity: 0.72,
              minWidth: 0,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected": {
              color: buttonTextColor,
              opacity: 1,
            },
            "& .MuiBottomNavigationAction-label": {
              color: "inherit",
              fontSize: "0.7rem",
            },
            "& .MuiBottomNavigationAction-label.Mui-selected": {
              fontSize: "0.7rem",
            },
            "& .MuiSvgIcon-root": {
              color: "inherit",
            },
          }}
        >
          <BottomNavigationAction label="Лента" value="feed" icon={<HomeOutlinedIcon />} />
          <BottomNavigationAction label="Гости" value="guests" icon={<PeopleOutlineIcon />} />
          <BottomNavigationAction
            label="Чаты"
            value="chats"
            icon={
              <Badge
                color="error"
                badgeContent={unreadTotal}
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    bgcolor: "#d32f2f",
                    color: "#fff",
                  },
                }}
              >
                <ChatBubbleOutlineIcon />
              </Badge>
            }
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
