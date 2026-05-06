import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  colorGridSx: SxProps<Theme>;
  playerVoteOptionTextColor: string;
  setPlayerVoteOptionTextColor: (value: string) => void;
  playerVoteProgressBarColor: string;
  setPlayerVoteProgressBarColor: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandPlayerUiResultsSection(props: Props) {
  const {
    colorGridSx,
    playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor,
    playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor,
    emitPatch,
  } = props;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Интерфейс пользователя</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Результаты: текст ответов"
            value={playerVoteOptionTextColor}
            onChange={setPlayerVoteOptionTextColor}
            onBlur={() => emitPatch({ playerVoteOptionTextColor })}
          />
          <CompactColorField
            label="Результаты: заполнение прогресс-бара"
            value={playerVoteProgressBarColor}
            onChange={setPlayerVoteProgressBarColor}
            onBlur={() => emitPatch({ playerVoteProgressBarColor })}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
