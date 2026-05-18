import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { BRAND_ACCENT, BRAND_BORDER } from "../../theme/brandTheme";
import type { DemoTitrePair } from "./DemoScenarioCaptions";
import { DemoProjectorSceneCaptions } from "./DemoScenarioCaptions";

export type LandingDemoScenarioShellProps = {
  /** Текст над сценой; для квиза можно не передавать */
  description?: ReactNode;
  sceneProgress: number;
  sceneIndex: number;
  captionPairs: ReadonlyArray<DemoTitrePair>;
  phoneSlot: ReactNode;
  projectorSlot: ReactNode;
};

export function LandingDemoScenarioShell(props: LandingDemoScenarioShellProps) {
  const { description, sceneProgress, sceneIndex, captionPairs, phoneSlot, projectorSlot } = props;

  return (
    <Box
      sx={{
        position: "sticky",
        top: { xs: 96, md: 96 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <Stack spacing={2.5} sx={{ mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={Math.round(sceneProgress * 100)}
          sx={{
            height: 3,
            borderRadius: 999,
            bgcolor: "rgba(255,255,255,0.12)",
            "& .MuiLinearProgress-bar": { bgcolor: BRAND_ACCENT },
          }}
        />
      </Stack>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {description != null && description !== false ? (
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 780, mb: 2.5 }}
          >
            {description}
          </Typography>
        ) : null}

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems={{ xs: "stretch", md: "flex-start" }}
        >
          {phoneSlot}

          <Stack
            sx={{
              flex: 1,
              minWidth: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
            spacing={1.5}
          >
            <Box
              sx={{
                width: "100%",
                aspectRatio: "16 / 9",
                border: `1px solid ${BRAND_BORDER}`,
                backgroundImage:
                  "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.68)), url('/event-bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                p: { xs: 2, md: 3 },
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {projectorSlot}
              </Box>
            </Box>
            <DemoProjectorSceneCaptions pairs={captionPairs} sceneIndex={sceneIndex} />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
