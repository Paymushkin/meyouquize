import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { voteOptionBorderColorToPickerHex } from "@meyouquize/shared";
import { CompactColorField } from "./CompactColorField";
import { VoteQuestionTextStyleField } from "./VoteQuestionTextStyleField";

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
  voteOptionBorderColor: string;
  setVoteOptionBorderColor: (value: string) => void;
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
    voteOptionBorderColor,
    setVoteOptionBorderColor,
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
          <VoteQuestionTextStyleField
            label="Текст вопроса (голосование)"
            value={voteQuestionTextColor}
            onChange={setVoteQuestionTextColor}
            onCommit={(next) => emitPatch({ voteQuestionTextColor: next })}
          />
          <CompactColorField
            label="Текст ответов и % (проектор)"
            value={voteOptionTextColor}
            onChange={setVoteOptionTextColor}
            onBlur={() => emitPatch({ voteOptionTextColor })}
          />
          <CompactColorField
            label="Бордер вариантов (проектор)"
            value={voteOptionBorderColorToPickerHex(voteOptionBorderColor)}
            onChange={setVoteOptionBorderColor}
            onBlur={() => emitPatch({ voteOptionBorderColor })}
          />
          <CompactColorField
            label="Трек столбика (проектор)"
            value={voteProgressTrackColor}
            onChange={setVoteProgressTrackColor}
            onBlur={() => emitPatch({ voteProgressTrackColor })}
          />
          <VoteQuestionTextStyleField
            label="Заполнение столбика (проектор)"
            value={voteProgressBarColor}
            onChange={setVoteProgressBarColor}
            onCommit={(next) => emitPatch({ voteProgressBarColor: next })}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
