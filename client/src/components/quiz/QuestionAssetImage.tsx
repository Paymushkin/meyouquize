import { Box, type SxProps, type Theme } from "@mui/material";
import { resolveClientAssetUrl } from "../../utils/resolveClientAssetUrl";

type Props = {
  url?: string | null;
  alt: string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  objectFit?: "contain" | "cover";
  sx?: SxProps<Theme>;
};

export function QuestionAssetImage(props: Props) {
  const {
    url,
    alt,
    maxWidth = "100%",
    maxHeight = 240,
    width,
    height,
    borderRadius = 1,
    objectFit = "contain",
    sx,
  } = props;
  const resolved = resolveClientAssetUrl(url?.trim() ?? "");
  if (!resolved) return null;
  return (
    <Box
      component="img"
      src={resolved}
      alt={alt}
      sx={{
        display: "block",
        width,
        height,
        maxWidth,
        maxHeight,
        borderRadius,
        objectFit,
        ...sx,
      }}
    />
  );
}
