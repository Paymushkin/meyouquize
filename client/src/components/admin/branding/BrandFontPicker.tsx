import { useMemo } from "react";
import { MenuItem, TextField } from "@mui/material";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import {
  buildBrandFontPatchForSelection,
  familyOptionLabel,
  listFontFamilyOptions,
  type AdminFontEntry,
} from "../../../features/admin/fontPickerUtils";

type Props = {
  brandFontFamily: string;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  setBrandFontUrls: (value: string[]) => void;
  availableFonts: AdminFontEntry[];
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandFontPicker({
  brandFontFamily,
  setBrandFontFamily,
  setBrandFontUrl,
  setBrandFontUrls,
  availableFonts,
  emitPatch,
}: Props) {
  const options = useMemo(() => listFontFamilyOptions(availableFonts), [availableFonts]);

  return (
    <TextField
      select
      size="small"
      label="Шрифт"
      value={brandFontFamily}
      onChange={(e) => {
        const next = e.target.value;
        const patch = buildBrandFontPatchForSelection(next, availableFonts);
        setBrandFontFamily(patch.brandFontFamily ?? next);
        setBrandFontUrl(patch.brandFontUrl ?? "");
        setBrandFontUrls(patch.brandFontUrls ?? []);
        emitPatch(patch);
      }}
      sx={{ minWidth: 280 }}
    >
      {options.map((option) => (
        <MenuItem key={option.cssFamily} value={option.cssFamily}>
          {familyOptionLabel(option)}
        </MenuItem>
      ))}
    </TextField>
  );
}
