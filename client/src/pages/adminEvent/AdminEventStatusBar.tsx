import { Box, Paper, Stack, Typography } from "@mui/material";

/** Высота полосы статуса (spacer под fixed). */
export const ADMIN_EVENT_STATUS_BAR_HEIGHT_PX = 33;

export type AdminEventStatusBarProps = {
  currentPublicScreenText: string;
  adminSocketStatus: "connected" | "connecting" | "disconnected";
  onlineUsersCount: number;
  adminLogin?: string | null;
};

export function AdminEventStatusBar({
  currentPublicScreenText,
  adminSocketStatus,
  onlineUsersCount,
  adminLogin,
}: AdminEventStatusBarProps) {
  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          width: "100%",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "#111",
            color: "#fff",
            px: { xs: 1, sm: 2 },
            py: 0.75,
            minHeight: ADMIN_EVENT_STATUS_BAR_HEIGHT_PX,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Typography variant="caption">Экран: {currentPublicScreenText}</Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  adminSocketStatus === "connected"
                    ? "success.light"
                    : adminSocketStatus === "connecting"
                      ? "warning.light"
                      : "error.light",
              }}
            >
              Статус:{" "}
              {adminSocketStatus === "connected"
                ? "подключено"
                : adminSocketStatus === "connecting"
                  ? "подключение..."
                  : "отключено"}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption">Онлайн: {onlineUsersCount}</Typography>
              {adminLogin ? <Typography variant="caption">Вы: {adminLogin}</Typography> : null}
            </Stack>
          </Stack>
        </Paper>
      </Box>
      <Box
        aria-hidden
        sx={{
          height: ADMIN_EVENT_STATUS_BAR_HEIGHT_PX,
          flexShrink: 0,
          width: "100%",
        }}
      />
    </>
  );
}
