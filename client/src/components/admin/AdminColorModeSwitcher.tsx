import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { useAdminColorMode } from "../../theme/AdminColorModeProvider";

export function AdminColorModeSwitcher() {
  const { mode, setMode } = useAdminColorMode();

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      justifyContent={{ xs: "center", md: "flex-start" }}
      sx={{
        mt: 1,
        pt: 1,
        px: { xs: 0.5, md: 1.25 },
        borderTop: 1,
        borderColor: "divider",
      }}
      role="group"
      aria-label="Тема админки"
    >
      <Tooltip title="Светлая тема">
        <IconButton
          size="small"
          color={mode === "light" ? "primary" : "default"}
          aria-label="Светлая тема"
          aria-pressed={mode === "light"}
          onClick={() => setMode("light")}
        >
          <LightModeOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Тёмная тема">
        <IconButton
          size="small"
          color={mode === "dark" ? "primary" : "default"}
          aria-label="Тёмная тема"
          aria-pressed={mode === "dark"}
          onClick={() => setMode("dark")}
        >
          <DarkModeOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
