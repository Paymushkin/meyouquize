import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { SxProps, Theme } from "@mui/material/styles";
import type { PublicViewSetPatch } from "../../../publicViewContract";
import { BrandImageUploadTile } from "./BrandImageUploadTile";
import { CompactColorField } from "./CompactColorField";

type Props = {
  colorGridSx: SxProps<Theme>;
  brandPrimaryColor: string;
  setBrandPrimaryColor: (value: string) => void;
  brandAccentColor: string;
  setBrandAccentColor: (value: string) => void;
  brandSurfaceColor: string;
  setBrandSurfaceColor: (value: string) => void;
  brandTextColor: string;
  setBrandTextColor: (value: string) => void;
  brandBackgroundOverlayColor: string;
  setBrandBackgroundOverlayColor: (value: string) => void;
  brandLogoUrl: string;
  setBrandLogoUrl: (value: string) => void;
  brandPlayerBackgroundImageUrl: string;
  setBrandPlayerBackgroundImageUrl: (value: string) => void;
  brandProjectorBackgroundImageUrl: string;
  setBrandProjectorBackgroundImageUrl: (value: string) => void;
  onUploadMedia: (file: File) => Promise<string>;
  onUploadFontError: (message: string) => void;
  emitPatch: (patch: PublicViewSetPatch) => void;
};

export function BrandImagesSection(props: Props) {
  const {
    colorGridSx,
    brandPrimaryColor,
    setBrandPrimaryColor,
    brandAccentColor,
    setBrandAccentColor,
    brandSurfaceColor,
    setBrandSurfaceColor,
    brandTextColor,
    setBrandTextColor,
    brandBackgroundOverlayColor,
    setBrandBackgroundOverlayColor,
    brandLogoUrl,
    setBrandLogoUrl,
    brandPlayerBackgroundImageUrl,
    setBrandPlayerBackgroundImageUrl,
    brandProjectorBackgroundImageUrl,
    setBrandProjectorBackgroundImageUrl,
    onUploadMedia,
    onUploadFontError,
    emitPatch,
  } = props;

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Цвета и изображения бренда</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Box sx={colorGridSx}>
            <CompactColorField
              label="Primary"
              value={brandPrimaryColor}
              onChange={setBrandPrimaryColor}
              onBlur={() => emitPatch({ brandPrimaryColor })}
            />
            <CompactColorField
              label="Accent"
              value={brandAccentColor}
              onChange={setBrandAccentColor}
              onBlur={() => emitPatch({ brandAccentColor })}
            />
            <CompactColorField
              label="Surface"
              value={brandSurfaceColor}
              onChange={setBrandSurfaceColor}
              onBlur={() => emitPatch({ brandSurfaceColor })}
            />
            <CompactColorField
              label="Text"
              value={brandTextColor}
              onChange={setBrandTextColor}
              onBlur={() => emitPatch({ brandTextColor })}
            />
            <CompactColorField
              label="Overlay"
              value={brandBackgroundOverlayColor}
              onChange={setBrandBackgroundOverlayColor}
              onBlur={() => emitPatch({ brandBackgroundOverlayColor })}
            />
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1,
            }}
          >
            <BrandImageUploadTile
              title="Логотип"
              value={brandLogoUrl}
              uploadErrorLabel="Не удалось загрузить логотип"
              onUploadMedia={onUploadMedia}
              onUploaded={(url) => {
                setBrandLogoUrl(url);
                emitPatch({ brandLogoUrl: url });
              }}
              onError={onUploadFontError}
            />
            <BrandImageUploadTile
              title="Фон интерфейса"
              value={brandPlayerBackgroundImageUrl}
              uploadErrorLabel="Не удалось загрузить фон"
              onUploadMedia={onUploadMedia}
              onUploaded={(url) => {
                setBrandPlayerBackgroundImageUrl(url);
                emitPatch({ brandPlayerBackgroundImageUrl: url });
              }}
              onError={onUploadFontError}
            />
            <BrandImageUploadTile
              title="Фон проектора"
              value={brandProjectorBackgroundImageUrl}
              uploadErrorLabel="Не удалось загрузить фон проектора"
              onUploadMedia={onUploadMedia}
              onUploaded={(url) => {
                setBrandProjectorBackgroundImageUrl(url);
                emitPatch({ brandProjectorBackgroundImageUrl: url });
              }}
              onError={onUploadFontError}
            />
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
