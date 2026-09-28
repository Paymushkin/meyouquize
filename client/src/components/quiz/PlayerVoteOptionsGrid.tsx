import { Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  contrastingTextOnColor,
  sanitizeOptionColor,
  withDebateOptionColors,
} from "@meyouquize/shared";
import { pcq } from "../../features/quizPlay/playerContainerQuery";
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
  color?: string | null;
};

type Props = {
  options: VoteOption[];
  /** Дебаты: те же цвета, что на шкале проектора. */
  coloredByOption?: boolean;
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
  accentColor?: string | null,
) {
  const layoutSx = {
    boxSizing: "border-box" as const,
    transition: "background-color 180ms ease, border-color 180ms ease, color 180ms ease",
    boxShadow: "none",
    justifyContent: "flex-start",
    textAlign: "left" as const,
    whiteSpace: "normal" as const,
    px: cardLayout ? pcq(1, 1.5) : 2,
    py: cardLayout ? pcq(1, 1.5) : 1.25,
    ...(cardLayout
      ? {
          flexDirection: "column" as const,
          alignItems: "stretch",
        }
      : {}),
  };

  if (accentColor) {
    const textOnAccent = contrastingTextOnColor(accentColor);
    return {
      ...layoutSx,
      border: "2px solid",
      borderColor: accentColor,
      bgcolor: isSelected ? accentColor : "transparent",
      color: isSelected ? textOnAccent : "#ffffff",
      "&:hover": {
        bgcolor: isSelected ? alpha(accentColor, 0.88) : "rgba(255,255,255,0.06)",
        borderColor: accentColor,
      },
    };
  }

  return {
    ...layoutSx,
    border: "2px solid",
    borderColor: isSelected ? brandPrimaryColor : "rgba(255,255,255,0.45)",
    bgcolor: isSelected ? brandPrimaryColor : "transparent",
    color: isSelected ? playerVoteOptionTextColor : "inherit",
    "&:hover": {
      bgcolor: isSelected ? alpha(brandPrimaryColor, 0.88) : "rgba(255,255,255,0.06)",
    },
  };
}

export function resolvePlayerVoteOptionColors(
  options: VoteOption[],
  coloredByOption: boolean,
): Array<string | null> {
  if (!coloredByOption) {
    return options.map((option) => sanitizeOptionColor(option.color));
  }
  return withDebateOptionColors(options).map((option) => option.color);
}

export function PlayerVoteOptionsGrid(props: Props) {
  const {
    options,
    coloredByOption = false,
    displayedSelected,
    answeredCurrentQuestion,
    brandPrimaryColor,
    playerVoteOptionTextColor,
    onToggleOption,
  } = props;
  const hasOptionImages = questionHasOptionImages(options);
  const optionColors = resolvePlayerVoteOptionColors(options, coloredByOption);

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
                optionColors[optionIndex],
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
