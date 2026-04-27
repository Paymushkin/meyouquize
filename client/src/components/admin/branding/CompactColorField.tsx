import { Box, Typography } from "@mui/material";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function CompactColorField(props: Props) {
  const { label, value, onChange, onBlur } = props;
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
        value={value}
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
    </Box>
  );
}
