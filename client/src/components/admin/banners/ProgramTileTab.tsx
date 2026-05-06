import { Box, Button, Stack, TextField, Typography } from "@mui/material";

type Props = {
  text: string;
  backgroundColor: string;
  textColor: string;
  linkUrl: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onChangeBackgroundColor: (value: string) => void;
  onChangeTextColor: (value: string) => void;
  onChangeLinkUrl: (value: string) => void;
  onSave: () => void;
  onToggleVisible: (
    next: boolean,
    payload: { text: string; backgroundColor: string; textColor: string; linkUrl: string },
  ) => void;
};

export function ProgramTileTab({
  text,
  backgroundColor,
  textColor,
  linkUrl,
  visible,
  onChangeText,
  onChangeBackgroundColor,
  onChangeTextColor,
  onChangeLinkUrl,
  onSave,
  onToggleVisible,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Кнопка «Программа»</Typography>
      <TextField
        label="Текст кнопки"
        size="small"
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Программа"
        fullWidth
      />
      <TextField
        label="Внешняя ссылка"
        size="small"
        value={linkUrl}
        onChange={(e) => onChangeLinkUrl(e.target.value)}
        placeholder="https://example.com/program"
        fullWidth
      />
      <TextField
        label="Фоновый цвет кнопки"
        size="small"
        value={backgroundColor}
        onChange={(e) => onChangeBackgroundColor(e.target.value)}
        placeholder="#6a1b9a"
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <Box
                component="input"
                type="color"
                aria-label="Выбрать цвет кнопки программы"
                value={backgroundColor || "#6a1b9a"}
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
      <TextField
        label="Цвет текста кнопки"
        size="small"
        value={textColor}
        onChange={(e) => onChangeTextColor(e.target.value)}
        placeholder="#ffffff"
        fullWidth
        slotProps={{
          input: {
            endAdornment: (
              <Box
                component="input"
                type="color"
                aria-label="Выбрать цвет текста кнопки программы"
                value={textColor || "#ffffff"}
                onChange={(e) => onChangeTextColor(e.target.value)}
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
          Сохранить кнопку
        </Button>
        <Button
          variant={visible ? "outlined" : "contained"}
          onClick={() => onToggleVisible(!visible, { text, backgroundColor, textColor, linkUrl })}
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
          backgroundColor: backgroundColor.trim() || "#6a1b9a",
          color: textColor.trim() || "#ffffff",
          py: 2,
          px: 2.5,
          whiteSpace: "pre-line",
          fontWeight: 700,
          minHeight: 72,
        }}
      >
        {text.trim() || "Программа"}
      </Box>
    </Stack>
  );
}
