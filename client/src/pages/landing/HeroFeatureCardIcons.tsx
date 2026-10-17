import { Box } from "@mui/material";

const ICON_SX = {
  width: { xs: 40, md: 48 },
  height: { xs: 40, md: 48 },
  display: "block",
  fill: "none",
  color: "currentColor",
} as const;

/** Тонкий outline смартфона как в референсе */
export function HeroSmartphoneIcon() {
  return (
    <Box component="svg" viewBox="0 0 48 48" aria-hidden sx={ICON_SX}>
      <rect x="15" y="5" width="18" height="38" rx="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M21 10.5h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="24" cy="37" r="2" stroke="currentColor" strokeWidth="1.75" />
    </Box>
  );
}

/** Тонкий outline видеокамеры как в референсе */
export function HeroVideoCameraIcon() {
  return (
    <Box component="svg" viewBox="0 0 48 48" aria-hidden sx={ICON_SX}>
      <rect x="7" y="15" width="24" height="18" rx="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M31 19.5 40 15.5v17l-9-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Box>
  );
}
