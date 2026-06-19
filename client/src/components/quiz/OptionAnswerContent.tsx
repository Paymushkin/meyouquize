import { Box, Stack } from "@mui/material";
import {
  optionAltText,
  optionHasImage,
  PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE,
} from "../../features/quizPlay/voteOptionImages";
import { QuestionAssetImage } from "./QuestionAssetImage";

export type OptionAnswerLayout = "inline" | "card";

type Props = {
  text: string;
  imageUrl?: string | null;
  layout?: OptionAnswerLayout;
  textSx?: Record<string, unknown>;
  compact?: boolean;
};

export function OptionAnswerContent(props: Props) {
  const { text, imageUrl, layout = "inline", textSx, compact = false } = props;
  const hasImage = optionHasImage(imageUrl);
  const hasText = Boolean(text.trim());
  const alt = optionAltText(text);

  if (layout === "card" && hasImage) {
    return (
      <Stack spacing={1} sx={{ width: "100%", alignItems: "stretch" }}>
        <QuestionAssetImage
          url={imageUrl}
          alt={alt}
          sx={{
            width: "100%",
            maxHeight: compact ? { xs: 88, sm: 140 } : { xs: 120, sm: 140 },
            borderRadius: 1,
          }}
        />
        {hasText ? (
          <Box sx={{ width: "100%", textAlign: "left", lineHeight: 1.3, ...textSx }}>{text}</Box>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
      {hasImage ? (
        <QuestionAssetImage
          url={imageUrl}
          alt={alt}
          width={PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE}
          height={PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE}
          maxWidth={PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE}
          maxHeight={PLAYER_VOTE_INLINE_OPTION_IMAGE_SIZE}
          borderRadius={0.75}
        />
      ) : null}
      {hasText ? <Box sx={{ minWidth: 0, flex: 1, ...textSx }}>{text}</Box> : null}
    </Stack>
  );
}
