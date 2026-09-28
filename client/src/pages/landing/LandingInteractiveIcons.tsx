import { Box } from "@mui/material";

const ICON_SX = {
  width: 24,
  height: 24,
  display: "block",
  fill: "none",
  color: "currentColor",
  flexShrink: 0,
} as const;

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  vectorEffect: "non-scaling-stroke",
} as const;

export function InteractiveBarChartIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={ICON_SX}>
      <path {...STROKE} strokeLinecap="square" d="M6 18V12" />
      <path {...STROKE} strokeLinecap="square" d="M10 18V8" />
      <path {...STROKE} strokeLinecap="square" d="M14 18V14" />
      <path {...STROKE} strokeLinecap="square" d="M18 18V10" />
    </Box>
  );
}

export function InteractiveGroupsIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={ICON_SX}>
      <circle {...STROKE} cx="9" cy="9" r="2.5" />
      <path {...STROKE} strokeLinecap="round" d="M5 17.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <circle {...STROKE} cx="16" cy="10" r="2" />
      <path
        {...STROKE}
        strokeLinecap="round"
        d="M13.5 17.5c.4-1.6 1.7-2.8 3.3-2.8 1 0 1.9.4 2.6 1.1"
      />
    </Box>
  );
}

export function InteractiveChatIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={ICON_SX}>
      <path
        {...STROKE}
        strokeLinejoin="round"
        d="M7 7h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4.2L8 19v-3H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
      />
      <circle cx="10" cy="12" r="0.75" fill="currentColor" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      <circle cx="14" cy="12" r="0.75" fill="currentColor" />
    </Box>
  );
}

export function InteractivePieChartIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden sx={ICON_SX}>
      <circle {...STROKE} cx="12" cy="12" r="6.5" />
      <path {...STROKE} strokeLinecap="square" d="M12 5.5V12h6.5" />
    </Box>
  );
}
