import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  colorGridSx: SxProps<Theme>;
  projectorBackground: string;
  setProjectorBackground: (value: string) => void;
  brandBodyBackgroundColor: string;
  setBrandBodyBackgroundColor: (value: string) => void;
  voteQuestionTextColor: string;
  setVoteQuestionTextColor: (value: string) => void;
  voteOptionTextColor: string;
  setVoteOptionTextColor: (value: string) => void;
  voteProgressTrackColor: string;
  setVoteProgressTrackColor: (value: string) => void;
  voteProgressBarColor: string;
  setVoteProgressBarColor: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandScreenColorsSection(props: Props) {
  const {
    colorGridSx,
    projectorBackground,
    setProjectorBackground,
    brandBodyBackgroundColor,
    setBrandBodyBackgroundColor,
    voteQuestionTextColor,
    setVoteQuestionTextColor,
    voteOptionTextColor,
    setVoteOptionTextColor,
    voteProgressTrackColor,
    setVoteProgressTrackColor,
    voteProgressBarColor,
    setVoteProgressBarColor,
    emitPatch,
  } = props;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Экран и голосование</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Фон проектора"
            value={projectorBackground}
            onChange={setProjectorBackground}
            onBlur={() => emitPatch({ projectorBackground })}
          />
          <CompactColorField
            label="Фон body (player)"
            value={brandBodyBackgroundColor}
            onChange={setBrandBodyBackgroundColor}
            onBlur={() => emitPatch({ brandBodyBackgroundColor })}
          />
          <CompactColorField
            label="Текст вопроса (голосование)"
            value={voteQuestionTextColor}
            onChange={setVoteQuestionTextColor}
            onBlur={() => emitPatch({ voteQuestionTextColor })}
          />
          <CompactColorField
            label="Текст ответов и % (проектор)"
            value={voteOptionTextColor}
            onChange={setVoteOptionTextColor}
            onBlur={() => emitPatch({ voteOptionTextColor })}
          />
          <CompactColorField
            label="Трек столбика (проектор)"
            value={voteProgressTrackColor}
            onChange={setVoteProgressTrackColor}
            onBlur={() => emitPatch({ voteProgressTrackColor })}
          />
          <CompactColorField
            label="Заполнение столбика (проектор)"
            value={voteProgressBarColor}
            onChange={setVoteProgressBarColor}
            onBlur={() => emitPatch({ voteProgressBarColor })}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
