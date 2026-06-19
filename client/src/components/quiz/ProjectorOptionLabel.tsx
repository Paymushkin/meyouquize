import { Typography } from "@mui/material";
import {
  optionAltText,
  optionHasImage,
  PROJECTOR_OPTION_LABEL_IMAGE_SIZE,
} from "../../features/quizPlay/voteOptionImages";
import { ProjectorSideBySideContent } from "../projector/ProjectorSideBySideContent";

type Props = {
  text: string;
  imageUrl?: string | null;
  imageSize?: number;
  sx?: Record<string, unknown>;
};

export function ProjectorOptionLabel(props: Props) {
  const { text, imageUrl, imageSize = PROJECTOR_OPTION_LABEL_IMAGE_SIZE, sx } = props;
  const hasImage = optionHasImage(imageUrl);
  const hasText = Boolean(text.trim());
  const alt = optionAltText(text);

  if (hasImage) {
    return (
      <ProjectorSideBySideContent
        imageUrl={imageUrl ?? undefined}
        alt={alt}
        spacing={1.5}
        imageSx={{
          width: imageSize,
          maxWidth: imageSize,
          maxHeight: imageSize,
          borderRadius: 1,
        }}
      >
        {hasText ? (
          <Typography component="span" sx={{ minWidth: 0, ...sx }}>
            {text}
          </Typography>
        ) : null}
      </ProjectorSideBySideContent>
    );
  }

  return hasText ? (
    <Typography component="span" sx={{ minWidth: 0, ...sx }}>
      {text}
    </Typography>
  ) : null;
}
