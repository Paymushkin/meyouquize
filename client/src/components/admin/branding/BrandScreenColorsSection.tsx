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
        <Typography variant="subtitle2">Проектор</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Цвет фона"
            value={projectorBackground}
            onChange={setProjectorBackground}
            onBlur={() => emitPatch({ projectorBackground })}
          />
          <VoteQuestionTextStyleField
            label="Цвет текста вопроса"
            value={voteQuestionTextColor}
            onChange={setVoteQuestionTextColor}
            onCommit={(next) => emitPatch({ voteQuestionTextColor: next })}
          />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <CompactColorField
              label="Цвет текста ответа и %"
              value={voteOptionTextColor}
              onChange={setVoteOptionTextColor}
              onBlur={() => emitPatch({ voteOptionTextColor })}
            />
            <CompactColorField
              label="Цвет границ ответа"
              value={voteOptionBorderColorToPickerHex(voteOptionBorderColor)}
              onChange={setVoteOptionBorderColor}
              onBlur={() => emitPatch({ voteOptionBorderColor })}
            />
            <CompactColorField
              label="Цвет графика"
              value={voteProgressTrackColor}
              onChange={setVoteProgressTrackColor}
              onBlur={() => emitPatch({ voteProgressTrackColor })}
            />
          </Box>
          <VoteQuestionTextStyleField
            label="Цвет заполнения графика"
            value={voteProgressBarColor}
            onChange={setVoteProgressBarColor}
            onCommit={(next) => emitPatch({ voteProgressBarColor: next })}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
