import type { ReactNode } from "react";
import { Stack, type SxProps, type Theme } from "@mui/material";
import { optionHasImage } from "../../features/quizPlay/voteOptionImages";
import { QuestionAssetImage } from "../quiz/QuestionAssetImage";

type Props = {
  imageUrl?: string | null;
  alt: string;
  imageSx?: SxProps<Theme>;
  spacing?: number;
  children?: ReactNode;
};

export function ProjectorSideBySideContent(props: Props) {
  const { imageUrl, alt, imageSx, spacing = 2.5, children } = props;
  const hasImage = optionHasImage(imageUrl);
  const hasContent = children != null && children !== false;

  if (!hasImage) {
    return <>{children}</>;
  }

  if (!hasContent) {
    return (
      <QuestionAssetImage
        url={imageUrl}
        alt={alt}
        sx={{
          width: "100%",
          maxHeight: "40vh",
          borderRadius: 1.5,
          ...imageSx,
        }}
      />
    );
  }

  return (
    <Stack
      direction="row"
      spacing={spacing}
      alignItems="center"
      sx={{ width: "100%", minWidth: 0 }}
    >
      <QuestionAssetImage
        url={imageUrl}
        alt={alt}
        sx={{
          flexShrink: 0,
          width: { xs: 140, sm: 200, md: 260 },
          maxWidth: "38%",
          maxHeight: "40vh",
          borderRadius: 1.5,
          ...imageSx,
        }}
      />
      <Stack sx={{ flex: 1, minWidth: 0, justifyContent: "center" }}>{children}</Stack>
    </Stack>
  );
}
