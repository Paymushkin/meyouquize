import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { PublicViewSetPatch } from "../../../publicViewContract";

type AvailableFont = { id: string; family: string; url: string; kind: "static" | "variable" };

function looksItalicUrl(url: string): boolean {
  return /italic|oblique/i.test(url);
}

type Props = {
  brandFontFamily: string;
  setBrandFontFamily: (value: string) => void;
  setBrandFontUrl: (value: string) => void;
  availableFonts: AvailableFont[];
  onUploadFont: (
    files: File[],
    family: string,
    kind: "static" | "variable",
  ) => Promise<{ family: string; url: string }>;
  onUploadFontError: (message: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandFontsSection(props: Props) {
  const {
    brandFontFamily,
    setBrandFontFamily,
    setBrandFontUrl,
    availableFonts,
    onUploadFont,
    onUploadFontError,
    emitPatch,
  } = props;
  const [uploadFontFamily, setUploadFontFamily] = useState("");
  const [uploadFontKind, setUploadFontKind] = useState<"static" | "variable">("static");
  const uniqueFonts = useMemo(() => {
    const byFamily = new Map<string, AvailableFont>();
    for (const font of availableFonts) {
      const existing = byFamily.get(font.family);
      if (!existing) {
        byFamily.set(font.family, font);
        continue;
      }
      // Prefer variable face as representative when family duplicates exist.
      if (font.kind === "variable" && existing.kind !== "variable") {
        byFamily.set(font.family, font);
        continue;
      }
      // Prefer non-italic face if both belong to the same family.
      if (looksItalicUrl(existing.url) && !looksItalicUrl(font.url)) {
        byFamily.set(font.family, font);
      }
    }
    return Array.from(byFamily.values());
  }, [availableFonts]);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Шрифты и типографика</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="Шрифт"
            value={brandFontFamily}
            onChange={(e) => {
              const next = e.target.value;
              setBrandFontFamily(next);
              const familyName =
                next
                  .split(",")[0]
                  ?.trim()
                  .replace(/^["']|["']$/g, "") ?? "";
              const familyFonts = availableFonts.filter((f) => f.family === familyName);
              const selected =
                familyFonts.find((f) => !looksItalicUrl(f.url)) ??
                familyFonts.find((f) => f.kind === "variable") ??
                familyFonts[0] ??
                uniqueFonts.find((f) => `"${f.family}", Arial, sans-serif` === next);
              const nextUrl = selected?.url ?? "";
              setBrandFontUrl(nextUrl);
              emitPatch({ brandFontFamily: next, brandFontUrl: nextUrl });
            }}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="Jost, Arial, sans-serif">Jost</MenuItem>
            <MenuItem value="Inter, Arial, sans-serif">Inter</MenuItem>
            <MenuItem value="Montserrat, Arial, sans-serif">Montserrat</MenuItem>
            <MenuItem value="Roboto, Arial, sans-serif">Roboto</MenuItem>
            <MenuItem value="Arial, sans-serif">Arial</MenuItem>
            {uniqueFonts.map((font) => (
              <MenuItem key={font.id} value={`"${font.family}", Arial, sans-serif`}>
                {font.family}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Семейство для загрузки"
            value={uploadFontFamily}
            onChange={(e) => setUploadFontFamily(e.target.value)}
            placeholder="Например: Styrene A"
            sx={{ minWidth: 220 }}
            required
          />
          <TextField
            select
            size="small"
            label="Тип файла"
            value={uploadFontKind}
            onChange={(e) =>
              setUploadFontKind((e.target.value as "static" | "variable") || "static")
            }
            sx={{ width: 150 }}
          >
            <MenuItem value="static">static</MenuItem>
            <MenuItem value="variable">variable</MenuItem>
          </TextField>
          <Box>
            <input
              id="brand-font-upload"
              type="file"
              multiple
              accept=".woff2,font/woff2"
              style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = "";
                if (!files.length) return;
                const family = uploadFontFamily.trim();
                if (!family) {
                  onUploadFontError("Укажите семейство для загрузки");
                  return;
                }
                try {
                  const created = await onUploadFont(files, family, uploadFontKind);
                  const nextFamily = `"${created.family}", Arial, sans-serif`;
                  setBrandFontFamily(nextFamily);
                  setBrandFontUrl(created.url);
                  emitPatch({ brandFontFamily: nextFamily, brandFontUrl: created.url });
                } catch (error) {
                  onUploadFontError(
                    error instanceof Error ? error.message : "Ошибка загрузки шрифта",
                  );
                }
              }}
            />
            <label htmlFor="brand-font-upload">
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 40,
                  px: 1.75,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  cursor: "pointer",
                  typography: "body2",
                }}
              >
                Загрузить шрифт
              </Box>
            </label>
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
