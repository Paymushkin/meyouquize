import { Stack, TextField, Typography } from "@mui/material";
import type { PublicViewSetPatch } from "../../../publicViewContract";

type Props = {
  colorGridSx: Record<string, unknown>;
  speakerTileBackgroundColor: string;
  setSpeakerTileBackgroundColor: (value: string) => void;
  speakerTileTextColor: string;
  setSpeakerTileTextColor: (value: string) => void;
  programTileBackgroundColor: string;
  setProgramTileBackgroundColor: (value: string) => void;
  programTileTextColor: string;
  setProgramTileTextColor: (value: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandTileColorsSection({
  colorGridSx,
  speakerTileBackgroundColor,
  setSpeakerTileBackgroundColor,
  speakerTileTextColor,
  setSpeakerTileTextColor,
  programTileBackgroundColor,
  setProgramTileBackgroundColor,
  programTileTextColor,
  setProgramTileTextColor,
  emitPatch,
}: Props) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">Цвета плиток speaker / program</Typography>
      <Stack sx={colorGridSx}>
        <TextField
          size="small"
          label="Speaker фон"
          type="color"
          value={speakerTileBackgroundColor}
          onChange={(e) => {
            const value = e.target.value;
            setSpeakerTileBackgroundColor(value);
            emitPatch({ speakerTileBackgroundColor: value });
          }}
        />
        <TextField
          size="small"
          label="Speaker текст"
          type="color"
          value={speakerTileTextColor}
          onChange={(e) => {
            const value = e.target.value;
            setSpeakerTileTextColor(value);
            emitPatch({ speakerTileTextColor: value });
          }}
        />
        <TextField
          size="small"
          label="Program фон"
          type="color"
          value={programTileBackgroundColor}
          onChange={(e) => {
            const value = e.target.value;
            setProgramTileBackgroundColor(value);
            emitPatch({ programTileBackgroundColor: value });
          }}
        />
        <TextField
          size="small"
          label="Program текст"
          type="color"
          value={programTileTextColor}
          onChange={(e) => {
            const value = e.target.value;
            setProgramTileTextColor(value);
            emitPatch({ programTileTextColor: value });
          }}
        />
      </Stack>
    </Stack>
  );
}
