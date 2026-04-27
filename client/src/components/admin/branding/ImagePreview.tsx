import { Box, Typography } from "@mui/material";

type Props = {
  label: string;
  url: string;
  height?: number;
};

export function ImagePreview(props: Props) {
  const { label, url, height = 150 } = props;
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {url.trim() ? (
        <>
          <Box
            component="img"
            src={url}
            alt={label}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.28)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                color: "#fff",
                bgcolor: "rgba(0, 0, 0, 0.38)",
                fontWeight: 600,
              }}
            >
              Загрузить
            </Typography>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0, 0, 0, 0.14)",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              color: "text.secondary",
              bgcolor: "rgba(255, 255, 255, 0.55)",
              fontWeight: 600,
            }}
          >
            Загрузить
          </Typography>
        </Box>
      )}
    </Box>
  );
}
