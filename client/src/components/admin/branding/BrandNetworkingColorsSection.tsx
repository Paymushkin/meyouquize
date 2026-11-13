import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { CompactColorField } from "./CompactColorField";

type Props = {
  colorGridSx: SxProps<Theme>;
  networkingProfileBackgroundColor: string;
  setNetworkingProfileBackgroundColor: (value: string) => void;
  networkingProfileTextColor: string;
  setNetworkingProfileTextColor: (value: string) => void;
  networkingProjectorIconColor: string;
  setNetworkingProjectorIconColor: (value: string) => void;
  networkingNavIconColor: string;
  setNetworkingNavIconColor: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandNetworkingColorsSection(props: Props) {
  const {
    colorGridSx,
    networkingProfileBackgroundColor,
    setNetworkingProfileBackgroundColor,
    networkingProfileTextColor,
    setNetworkingProfileTextColor,
    networkingProjectorIconColor,
    setNetworkingProjectorIconColor,
    networkingNavIconColor,
    setNetworkingNavIconColor,
    emitPatch,
  } = props;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Нетворкинг</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={colorGridSx}>
          <CompactColorField
            label="Фон профиля"
            value={networkingProfileBackgroundColor}
            onChange={setNetworkingProfileBackgroundColor}
            onBlur={() => emitPatch({ networkingProfileBackgroundColor })}
          />
          <CompactColorField
            label="Шрифт профиля"
            value={networkingProfileTextColor}
            onChange={setNetworkingProfileTextColor}
            onBlur={() => emitPatch({ networkingProfileTextColor })}
          />
          <CompactColorField
            label="Иконки на проекторе"
            value={networkingProjectorIconColor}
            onChange={setNetworkingProjectorIconColor}
            onBlur={() => emitPatch({ networkingProjectorIconColor })}
          />
          <CompactColorField
            label="Иконки навигации"
            value={networkingNavIconColor}
            onChange={setNetworkingNavIconColor}
            onBlur={() => emitPatch({ networkingNavIconColor })}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
