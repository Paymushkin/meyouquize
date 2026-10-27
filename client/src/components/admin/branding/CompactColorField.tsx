import { Box, Typography } from "@mui/material";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

const HEX6_RE = /^#([0-9a-fA-F]{6})$/;

/** `<input type="color">` принимает только #RRGGBB. */
function toColorInputValue(value: string, fallback = "#000000"): string {
  const trimmed = value.trim();
  return HEX6_RE.test(trimmed) ? trimmed : fallback;
}

export function CompactColorField(props: Props) {
  const { label, value, onChange, onBlur } = props;
  const colorValue = toColorInputValue(value);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        title={label}
        sx={{ flex: "0 1 auto", minWidth: 0 }}
      >
        {label}
      </Typography>
      <input
        type="color"
        value={colorValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-label={label}
        style={{
          width: 32,
          height: 26,
          padding: 0,
          border: "1px solid rgba(0,0,0,0.23)",
          borderRadius: 4,
          cursor: "pointer",
          flexShrink: 0,
          background: "transparent",
        }}
      />
      <Typography
        variant="caption"
        component="span"
        title={colorValue}
        sx={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          color: "text.secondary",
          flexShrink: 0,
          letterSpacing: 0.2,
        }}
      >
        {colorValue.toUpperCase()}
      </Typography>
    </Box>
  );
}
