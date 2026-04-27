import { Box, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { PlayerVisibleResultTile } from "../../pages/quiz-play/types";

type Props = {
  tiles: PlayerVisibleResultTile[];
  brandPrimaryColor: string;
  onSelectQuestion: (questionId: string) => void;
};

export function PlayerVisibleResultTiles(props: Props) {
  const { tiles, brandPrimaryColor, onSelectQuestion } = props;
  if (tiles.length === 0) return null;
  return (
    <Box sx={{ width: "100%", mt: 1, mb: 2 }}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ width: "100%" }}>
        {tiles.map((tile) => {
          const total = tile.optionStats.reduce((sum, row) => sum + row.count, 0);
          return (
            <Card
              key={tile.questionId}
              variant="outlined"
              component="button"
              type="button"
              onClick={() => onSelectQuestion(tile.questionId)}
              sx={{
                width: {
                  xs: "calc((100% - 8px) / 2)",
                  sm: "calc((100% - 8px) / 2)",
                  md: "calc((100% - 16px) / 3)",
                },
                aspectRatio: "1 / 1",
                textAlign: "left",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(0,0,0,0.22)",
                backdropFilter: "blur(3px)",
                p: { xs: 1.75, sm: 2 },
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: { xs: 42, sm: 50 },
                  background:
                    "linear-gradient(to bottom, rgba(8,12,24,0) 0%, rgba(8,12,24,0.85) 62%, rgba(8,12,24,0.98) 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                },
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  "&:last-child": { pb: 0 },
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Stack spacing={{ xs: 1.2, sm: 1.35 }} sx={{ height: "100%" }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      lineHeight: 1.2,
                      fontSize: { xs: "1rem", sm: "1.1rem" },
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={tile.text}
                  >
                    {tile.text}
                  </Typography>
                  <Stack spacing={{ xs: 0.95, sm: 1.1 }} sx={{ mt: 0.85 }}>
                    {tile.optionStats.slice(0, 3).map((row) => {
                      const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                      return (
                        <Box key={`${tile.questionId}_${row.optionId}`} sx={{ p: 0 }}>
                          <Box
                            sx={{ position: "relative", borderRadius: "5px", overflow: "hidden" }}
                          >
                            <LinearProgress
                              color="primary"
                              variant="determinate"
                              value={pct}
                              sx={{
                                position: "absolute",
                                inset: 0,
                                height: "100%",
                                bgcolor: alpha(brandPrimaryColor, 0.35),
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor: brandPrimaryColor,
                                },
                              }}
                            />
                            <Typography
                              variant="caption"
                              component="div"
                              title={row.text}
                              sx={{
                                position: "relative",
                                color: "#fff",
                                fontWeight: 400,
                                fontSize: { xs: "0.9rem", sm: "0.98rem" },
                                textShadow: "0 1px 2px rgba(0,0,0,0.65)",
                                pointerEvents: "none",
                                px: { xs: 1.75, sm: 2 },
                                py: { xs: 0.95, sm: 1.1 },
                                maxWidth: "100%",
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  display: "-webkit-box",
                                  lineHeight: 1.15,
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  maxHeight: "2.3em",
                                }}
                              >
                                {row.text}
                              </Box>
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
