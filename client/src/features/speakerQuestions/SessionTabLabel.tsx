import { Box } from "@mui/material";

/** Подпись таба сессии со счётчиком сверху справа. */
export function SessionTabLabel({ name, count }: { name: string; count: number }) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        pr: 1.75,
      }}
    >
      <Box component="span">{name}</Box>
      <Box
        component="span"
        sx={{
          position: "absolute",
          top: -4,
          right: 0,
          minWidth: 14,
          height: 14,
          px: 0.35,
          borderRadius: 7,
          bgcolor: "#fff",
          color: "#5b3fa8",
          fontSize: 10,
          fontWeight: 800,
          lineHeight: "14px",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

export const SPEAKER_SESSION_TABS_SX = {
  color: "#fff",
  minHeight: 40,
  "& .MuiTab-root": {
    color: "rgba(255,255,255,0.72)",
    minHeight: 40,
    px: 1.25,
    overflow: "visible",
    textTransform: "none",
    fontWeight: 600,
  },
  "& .MuiTabs-flexContainer": {
    overflow: "visible",
  },
  "& .MuiTabs-scroller": {
    overflow: "visible !important",
  },
  "& .Mui-selected": {
    color: "#fff",
  },
  "& .MuiTabs-indicator": {
    backgroundColor: "#fff",
  },
  "& .MuiTabs-scrollButtons": {
    color: "#fff",
  },
} as const;
