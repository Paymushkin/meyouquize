import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
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
import { playerQuestionTitleFontSizeSx } from "../../features/voteUi/voteQuestionLayout";
import type { ActiveFeedbackForm } from "../../types/feedback";

type Props = {
  brandPrimaryColor: string;
  playerVoteOptionTextColor: string;
  form: ActiveFeedbackForm;
  scaleAnswers: Record<string, number>;
  comment: string;
  onCommentChange: (value: string) => void;
  onSelectOption: (scaleId: string, optionIndex: number) => void;
  onClose: () => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  submittedFlash: boolean;
};

export function FeedbackPopupCard(props: Props) {
  const {
    brandPrimaryColor,
    playerVoteOptionTextColor,
    form,
    scaleAnswers,
    comment,
    onCommentChange,
    onSelectOption,
    onClose,
    canSubmit,
    submitting,
    onSubmit,
    submittedFlash,
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
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1410,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1.5, sm: 2.5 },
        backgroundColor: "rgba(0, 0, 0, 0.42)",
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 678,
          maxHeight: "80vh",
          overflowY: "auto",
          bgcolor: "rgba(38, 38, 38, 0.84)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ bgcolor: "transparent", color: "inherit" }}>
          <Stack spacing={2}>
            {submittedFlash ? (
              <Alert severity="success">Спасибо! Ваш отзыв отправлен.</Alert>
            ) : null}
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
            {!submittedFlash ? (
              <>
                <Stack spacing={3.5} sx={{ width: "100%" }}>
                  {form.scales.map((scale) => (
                    <Stack key={scale.id} spacing={1.25}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.2,
                          fontSize: playerQuestionTitleFontSizeSx(scale.label.trim().length),
                          py: 0.5,
                        }}
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
                  {form.commentEnabled ? (
                    <TextField
                      value={comment}
                      onChange={(e) => onCommentChange(e.target.value)}
                      placeholder={form.commentPlaceholder || "Комментарий"}
                      multiline
                      minRows={2}
                      fullWidth
                      sx={{
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
                      }}
                    />
                  ) : null}
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
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
