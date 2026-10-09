import { Box } from "@mui/material";

/** Подпись таба сессии со счётчиком сверху справа. */
export function SessionTabLabel({ name, count }: { name: string; count: number }) {
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        maxWidth: 200,
        width: "100%",
        pr: 1.75,
        textAlign: "left",
      }}
    >
      <Box
        component="span"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 200,
          textAlign: "left",
          whiteSpace: "normal",
          wordBreak: "break-word",
          lineHeight: 1.25,
        }}
      >
        {name}
      </Box>
      <Box
        component="span"
        sx={{
          position: "absolute",
          top: -8,
          right: -6,
          minWidth: 14,
          height: 14,
          px: 0.35,
          borderRadius: 7,
          bgcolor: "primary.main",
          color: "primary.contrastText",
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
  pt: 1,
  overflow: "hidden",
  "& .MuiTab-root": {
    color: "rgba(255,255,255,0.72)",
    minHeight: 40,
    maxWidth: 232,
    px: 1.25,
    overflow: "visible",
    textTransform: "none",
    fontWeight: 600,
    whiteSpace: "normal",
    textAlign: "left",
    alignItems: "flex-start",
  },
  "& .MuiTabs-flexContainer": {
    gap: 0,
    alignItems: "stretch",
  },
  "& .MuiTabs-scroller": {
    overflowX: "auto !important",
    overflowY: "hidden !important",
    // Badge counts sit above the tab label.
    marginTop: -4,
    paddingTop: 4,
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
