import { Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  playerOptionImageGridTemplate,
  questionHasOptionImages,
  shouldSpanFullWidthInOptionGrid,
} from "../../features/quizPlay/voteOptionImages";
import { OptionAnswerContent } from "./OptionAnswerContent";

type VoteOption = {
  id: string;
  text: string;
  imageUrl?: string;
};

type Props = {
  options: VoteOption[];
  displayedSelected: string[];
  answeredCurrentQuestion: boolean;
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  onToggleOption: (optionId: string) => void;
};

function buildOptionButtonSx(
  isSelected: boolean,
  brandPrimaryColor: string,
  playerVoteOptionTextColor: string,
  cardLayout: boolean,
) {
  return {
    boxSizing: "border-box" as const,
    border: "2px solid",
    borderColor: isSelected ? brandPrimaryColor : "rgba(255,255,255,0.45)",
    bgcolor: isSelected ? brandPrimaryColor : "transparent",
    color: isSelected ? playerVoteOptionTextColor : "inherit",
    "&:hover": {
      bgcolor: isSelected ? alpha(brandPrimaryColor, 0.88) : "rgba(255,255,255,0.06)",
    },
    transition: "background-color 180ms ease, border-color 180ms ease, color 180ms ease",
    boxShadow: "none",
    justifyContent: "flex-start",
    textAlign: "left" as const,
    whiteSpace: "normal" as const,
    px: cardLayout ? { xs: 1, sm: 1.5 } : 2,
    py: cardLayout ? { xs: 1, sm: 1.5 } : 1.25,
    ...(cardLayout
      ? {
          flexDirection: "column" as const,
          alignItems: "stretch",
        }
      : {}),
  };
}

export function PlayerVoteOptionsGrid(props: Props) {
  const {
    options,
    displayedSelected,
    answeredCurrentQuestion,
    brandPrimaryColor,
    playerVoteOptionTextColor,
    onToggleOption,
  } = props;
  const hasOptionImages = questionHasOptionImages(options);

  return (
    <Box
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: playerOptionImageGridTemplate(hasOptionImages),
        gap: 1.25,
        alignItems: "stretch",
      }}
    >
      {options.map((option, optionIndex) => {
        const isSelected = displayedSelected.includes(option.id);
        const spanFullWidth = shouldSpanFullWidthInOptionGrid(
          hasOptionImages,
          options.length,
          optionIndex,
        );
        return (
          <Button
            key={option.id}
            fullWidth
            variant="outlined"
            color="inherit"
            sx={{
              ...buildOptionButtonSx(
                isSelected,
                brandPrimaryColor,
                playerVoteOptionTextColor,
                hasOptionImages,
              ),
              ...(spanFullWidth ? { gridColumn: "1 / -1" } : {}),
            }}
            disabled={answeredCurrentQuestion}
            onClick={() => onToggleOption(option.id)}
          >
            <OptionAnswerContent
              text={option.text}
              imageUrl={option.imageUrl}
              layout={hasOptionImages ? "card" : "inline"}
              compact={hasOptionImages}
            />
          </Button>
        );
      })}
    </Box>
  );
}
