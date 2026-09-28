import { Box, CircularProgress } from "@mui/material";

export function RouteLoadingFallback() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
    >
      <CircularProgress size={36} />
    </Box>
  );
}
