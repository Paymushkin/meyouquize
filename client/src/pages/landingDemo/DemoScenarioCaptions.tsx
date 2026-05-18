import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import { Box, Stack, Typography } from "@mui/material";
import { useLayoutEffect, useRef, useState } from "react";
import { BRAND_ACCENT } from "../../theme/brandTheme";

export type DemoTitrePair = { prev: string | null; cur: string };

const DEMO_CAPTION_MS = 520;
const DEMO_CAPTION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const DEMO_CAPTION_CUR_LARGE = { xs: "1.85rem", sm: "2.05rem" } as const;
const DEMO_CAPTION_PREV_SMALL = { xs: "1.42rem", sm: "1.58rem" } as const;

function DemoProjectorCaptionLines(props: { pair: DemoTitrePair }) {
  const { pair } = props;
  return (
    <Stack spacing={0.5} alignItems="flex-start" sx={{ width: "100%" }}>
      {pair.prev ? (
        <Typography
          sx={{
            textAlign: "left",
            fontSize: DEMO_CAPTION_PREV_SMALL,
            fontWeight: 500,
            lineHeight: 1.22,
            color: "rgba(240,240,240,0.5)",
            letterSpacing: "0.02em",
            width: "100%",
          }}
        >
          {pair.prev}
        </Typography>
      ) : null}
      <Typography
        sx={{
          textAlign: "left",
          fontSize: DEMO_CAPTION_CUR_LARGE,
          fontWeight: 700,
          lineHeight: 1.26,
          color: "#f2f2f2",
          letterSpacing: "0.025em",
          width: "100%",
        }}
      >
        {pair.cur}
      </Typography>
    </Stack>
  );
}

function DemoCaptionScrollHint() {
  return (
    <Box
      aria-hidden
      title="Листайте демо вниз колесом мыши или трекпадом"
      sx={{
        flexShrink: 0,
        width: { xs: 40, sm: 48 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "stretch",
      }}
    >
      <KeyboardDoubleArrowDownIcon
        sx={{
          fontSize: { xs: 34, sm: 40 },
          color: BRAND_ACCENT,
          filter: "drop-shadow(0 0 10px rgba(243,247,34,0.28))",
          "@keyframes demoCaptionScrollHint": {
            "0%, 100%": { transform: "translateY(0)", opacity: 0.55 },
            "50%": { transform: "translateY(8px)", opacity: 1 },
          },
          animation: "demoCaptionScrollHint 1.35s ease-in-out infinite",
        }}
      />
    </Box>
  );
}

export function DemoProjectorSceneCaptions(props: {
  sceneIndex: number;
  pairs: ReadonlyArray<DemoTitrePair>;
}) {
  const { pairs } = props;
  const last = pairs.length - 1;
  const sceneIndex = last >= 0 ? Math.min(last, Math.max(0, props.sceneIndex)) : 0;
  const pair = pairs[sceneIndex] ?? pairs[0] ?? { prev: null, cur: "" };

  const prevIndexRef = useRef(sceneIndex);
  const [exitPair, setExitPair] = useState<DemoTitrePair | null>(null);
  const [captionAnimCycle, setCaptionAnimCycle] = useState(0);

  useLayoutEffect(() => {
    if (sceneIndex === prevIndexRef.current) return;
    const oldIdx = prevIndexRef.current;
    prevIndexRef.current = sceneIndex;
    setExitPair(pairs[oldIdx] ?? pairs[0] ?? null);
    setCaptionAnimCycle((c) => c + 1);
    const t = window.setTimeout(() => setExitPair(null), DEMO_CAPTION_MS);
    return () => window.clearTimeout(t);
  }, [sceneIndex, pairs]);

  const enterAnim =
    captionAnimCycle > 0
      ? `demoProjCaptionIn ${DEMO_CAPTION_MS}ms ${DEMO_CAPTION_EASE} forwards`
      : "none";

  return (
    <Box sx={{ width: "100%", mt: "auto", pt: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 1.25 }}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        <Box
          aria-live="polite"
          sx={{
            position: "relative",
            overflow: "hidden",
            flex: 1,
            minWidth: 0,
            py: { xs: 1.25, sm: 1.4 },
            px: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            bgcolor: "rgba(0,0,0,0.42)",
            boxSizing: "border-box",
            "@keyframes demoProjCaptionIn": {
              from: { opacity: 0, transform: "translateY(44px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
            "@keyframes demoProjCaptionOut": {
              from: { opacity: 1, transform: "translateY(0)" },
              to: { opacity: 0, transform: "translateY(-36px)" },
            },
          }}
        >
          <Box
            key={sceneIndex}
            sx={{
              position: "relative",
              zIndex: 0,
              animation: enterAnim,
            }}
          >
            <DemoProjectorCaptionLines pair={pair} />
          </Box>
          {exitPair ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                py: { xs: 1.25, sm: 1.4 },
                px: { xs: 1, sm: 1.5 },
                boxSizing: "border-box",
                pointerEvents: "none",
                animation: `demoProjCaptionOut ${DEMO_CAPTION_MS}ms ${DEMO_CAPTION_EASE} forwards`,
              }}
            >
              <DemoProjectorCaptionLines pair={exitPair} />
            </Box>
          ) : null}
        </Box>
        <DemoCaptionScrollHint />
      </Stack>
    </Box>
  );
}
