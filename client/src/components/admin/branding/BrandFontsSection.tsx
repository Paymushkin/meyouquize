import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { BrandFontPicker } from "./BrandFontPicker";
import type { AdminFontEntry } from "../../../features/admin/fontPickerUtils";

type Props = {
  brandFontFamily: string;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandFontUrls: (value: string[]) => void;
  availableFonts: AdminFontEntry[];
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandFontsSection(props: Props) {
  const {
    brandFontFamily,
    setBrandFontFamily,
    setBrandFontUrl,
    setBrandFontUrls,
    availableFonts,
    emitPatch,
  } = props;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Шрифты и типографика</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <BrandFontPicker
            brandFontFamily={brandFontFamily}
            setBrandFontFamily={setBrandFontFamily}
            setBrandFontUrl={setBrandFontUrl}
            setBrandFontUrls={setBrandFontUrls}
            availableFonts={availableFonts}
            emitPatch={emitPatch}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
