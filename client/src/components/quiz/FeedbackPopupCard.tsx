import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  PLAYER_POPUP_ALIGN_SX,
  PLAYER_POPUP_CARD_SX,
  PLAYER_POPUP_OVERLAY_SX,
} from "./playerDialogStyles";
import { playerFeedbackScaleTitleSx } from "../../features/voteUi/voteQuestionLayout";
import type { ActiveFeedbackForm } from "../../types/feedback";

type Props = {
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  form: ActiveFeedbackForm;
  scaleAnswers: Record<string, number>;
  openFieldAnswers: Record<string, string>;
  onOpenFieldChange: (fieldId: string, value: string) => void;
  onSelectOption: (scaleId: string, optionIndex: number) => void;
  onClose: () => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

const openFieldSx = (brandPrimaryColor: string) => ({
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.35)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255,255,255,0.55)",
    },
    "&.Mui-focused fieldset": {
      borderColor: brandPrimaryColor,
      borderWidth: 2,
    },
  },
});

export function FeedbackPopupCard(props: Props) {
  const {
    brandPrimaryColor,
    playerVoteOptionTextColor,
    form,
    scaleAnswers,
    openFieldAnswers,
    onOpenFieldChange,
    onSelectOption,
    onClose,
    canSubmit,
    submitting,
    onSubmit,
  } = props;

  const optionButtonSx = (isSelected: boolean) => ({
    boxSizing: "border-box",
    flex: "0 0 auto",
    width: "fit-content",
    minWidth: "unset",
    maxWidth: "100%",
    height: "auto",
    minHeight: "unset",
    border: "2px solid",
    borderColor: isSelected ? brandPrimaryColor : "rgba(255,255,255,0.45)",
    bgcolor: isSelected ? brandPrimaryColor : "transparent",
    color: isSelected ? playerVoteOptionTextColor : "inherit",
    "&:hover": {
      bgcolor: isSelected ? alpha(brandPrimaryColor, 0.88) : "rgba(255,255,255,0.06)",
    },
    transition: "background-color 180ms ease, border-color 180ms ease, color 180ms ease",
    boxShadow: "none",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    px: 2,
    py: 1.25,
  });

  return (
    <Box sx={{ ...PLAYER_POPUP_OVERLAY_SX, zIndex: 1410 }}>
      <Box sx={PLAYER_POPUP_ALIGN_SX}>
        <Card variant="outlined" sx={PLAYER_POPUP_CARD_SX}>
          <CardContent sx={{ bgcolor: "transparent", color: "inherit" }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box />
                <IconButton
                  aria-label="Закрыть"
                  size="small"
                  onClick={onClose}
                  sx={{ color: "#fff" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={3.5} sx={{ width: "100%" }}>
                {form.scales.map((scale) => (
                  <Stack key={scale.id} spacing={1.25}>
                    <Typography
                      variant="h4"
                      sx={playerFeedbackScaleTitleSx(scale.label.trim().length)}
                    >
                      {scale.label}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1.25,
                        width: "100%",
                      }}
                    >
                      {scale.options.map((option, optionIndex) => {
                        const isSelected = scaleAnswers[scale.id] === optionIndex;
                        return (
                          <Button
                            key={`${scale.id}-${optionIndex}`}
                            variant="outlined"
                            color="inherit"
                            onClick={() => onSelectOption(scale.id, optionIndex)}
                            sx={optionButtonSx(isSelected)}
                          >
                            {option}
                          </Button>
                        );
                      })}
                    </Box>
                  </Stack>
                ))}
                {form.openFields.map((field) => (
                  <Stack key={field.id} spacing={1}>
                    <Typography
                      variant="h5"
                      sx={playerFeedbackScaleTitleSx(field.label.trim().length)}
                    >
                      {field.label}
                    </Typography>
                    <TextField
                      value={openFieldAnswers[field.id] ?? ""}
                      onChange={(e) => onOpenFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder || "Ваш ответ"}
                      multiline
                      minRows={2}
                      fullWidth
                      sx={openFieldSx(brandPrimaryColor)}
                    />
                  </Stack>
                ))}
              </Stack>
              <Box sx={{ pt: 3.5 }}>
                <Button
                  disabled={!canSubmit || submitting}
                  onClick={onSubmit}
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{
                    minHeight: 52,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: playerVoteOptionTextColor,
                    bgcolor: brandPrimaryColor,
                    "&:hover": { bgcolor: alpha(brandPrimaryColor, 0.88) },
                  }}
                >
                  Отправить ответ
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
