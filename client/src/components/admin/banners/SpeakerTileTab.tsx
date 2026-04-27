import { Box, Button, Stack, TextField, Typography } from "@mui/material";

type Props = {
  text: string;
  backgroundColor: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onChangeBackgroundColor: (value: string) => void;
  onSave: () => void;
  onToggleVisible: (next: boolean, payload: { text: string; backgroundColor: string }) => void;
};

export function SpeakerTileTab({
  text,
  backgroundColor,
  visible,
  onChangeText,
  onChangeBackgroundColor,
  onSave,
  onToggleVisible,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Плитка «Вопросы спикерам»</Typography>
      <TextField
        label="Текст плитки"
        size="small"
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Вопросы спикерам"
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
      />
      <TextField
        label="Фоновый цвет плитки"
        size="small"
        value={backgroundColor}
        onChange={(e) => onChangeBackgroundColor(e.target.value)}
        placeholder="#1976d2"
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <Box
                component="input"
                type="color"
                aria-label="Выбрать цвет плитки"
                value={backgroundColor || "#1976d2"}
                onChange={(e) => onChangeBackgroundColor(e.target.value)}
                sx={{
                  width: 28,
                  height: 28,
                  p: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
            ),
          },
        }}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "nowrap" }}>
        <Button variant="contained" onClick={onSave}>
          Сохранить плитку
        </Button>
        <Button
          variant={visible ? "outlined" : "contained"}
          onClick={() => onToggleVisible(!visible, { text, backgroundColor })}
        >
          {visible ? "Выкл" : "Вкл"}
        </Button>
      </Stack>
      <Box
        sx={{
          width: "100%",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: backgroundColor.trim() || "#1976d2",
          color: "#fff",
          py: 2,
          px: 2.5,
          whiteSpace: "pre-line",
          fontWeight: 700,
          minHeight: 72,
        }}
      >
        {text.trim() || "Вопросы спикерам"}
      </Box>
    </Stack>
  );
}
