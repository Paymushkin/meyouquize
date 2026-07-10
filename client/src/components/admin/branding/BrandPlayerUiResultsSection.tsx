import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  brandBodyBackgroundColor: string;
  setBrandBodyBackgroundColor: (value: string) => void;
  playerVoteOptionTextColor: string;
  setPlayerVoteOptionTextColor: (value: string) => void;
  playerVoteProgressBarColor: string;
  setPlayerVoteProgressBarColor: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandPlayerUiResultsSection(props: Props) {
  const {
    brandBodyBackgroundColor,
    setBrandBodyBackgroundColor,
    playerVoteOptionTextColor,
    setPlayerVoteOptionTextColor,
    playerVoteProgressBarColor,
    setPlayerVoteProgressBarColor,
    emitPatch,
  } = props;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Пользователь</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxWidth: 360 }}>
          <CompactColorField
            label="Фоновый цвет"
            value={brandBodyBackgroundColor}
            onChange={setBrandBodyBackgroundColor}
            onBlur={() => emitPatch({ brandBodyBackgroundColor })}
          />
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
