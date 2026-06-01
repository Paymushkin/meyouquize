import { useEffect, useState } from "react";
import {
  Box,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  buildVoteFillGradient,
  isVoteFillGradient,
  parseVoteFillGradient,
} from "@meyouquize/shared";

type Mode = "solid" | "gradient";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Сохранить на сервер (передаётся актуальное значение, не stale state). */
  onCommit: (value: string) => void;
};

const GRADIENT_ANGLES = [
  { deg: 90, label: "→" },
  { deg: 135, label: "↘" },
  { deg: 180, label: "↓" },
  { deg: 270, label: "←" },
] as const;

function resolveMode(value: string): Mode {
  return isVoteFillGradient(value) ? "gradient" : "solid";
}

function solidFromValue(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value.trim())) return value.trim();
  return "#ffffff";
}

export function VoteQuestionTextStyleField(props: Props) {
  const { label, value, onChange, onCommit } = props;
  const [mode, setMode] = useState<Mode>(() => resolveMode(value));
  const parsed = parseVoteFillGradient(value);
  const [gradientFrom, setGradientFrom] = useState(parsed?.from ?? "#ffffff");
  const [gradientTo, setGradientTo] = useState(parsed?.to ?? "#1976d2");
  const [gradientDeg, setGradientDeg] = useState(parsed?.deg ?? 135);

  useEffect(() => {
    setMode(resolveMode(value));
    const next = parseVoteFillGradient(value);
    if (next) {
      setGradientFrom(next.from);
      setGradientTo(next.to);
      setGradientDeg(next.deg);
    }
  }, [value]);

  const commit = (next: string) => {
    onChange(next);
    onCommit(next);
  };

  const commitGradient = (from: string, to: string, deg: number) => {
    commit(buildVoteFillGradient(from, to, deg));
  };

  return (
    <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
      <Stack spacing={0.75}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="caption" color="text.secondary" title={label}>
            {label}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, next: Mode | null) => {
              if (!next) return;
              setMode(next);
              if (next === "solid") {
                commit(solidFromValue(value));
              } else {
                commitGradient(gradientFrom, gradientTo, gradientDeg);
              }
            }}
          >
            <ToggleButton value="solid" sx={{ py: 0.15, px: 1, fontSize: "0.7rem" }}>
              Цвет
            </ToggleButton>
            <ToggleButton value="gradient" sx={{ py: 0.15, px: 1, fontSize: "0.7rem" }}>
              Градиент
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {mode === "solid" ? (
          <Stack direction="row" alignItems="center" gap={0.75}>
            <input
              type="color"
              value={solidFromValue(value)}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => commit(solidFromValue(value))}
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
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {solidFromValue(value)}
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
            <input
              type="color"
              value={gradientFrom}
              onChange={(e) => {
                const next = e.target.value;
                setGradientFrom(next);
                commitGradient(next, gradientTo, gradientDeg);
              }}
              onBlur={() => commitGradient(gradientFrom, gradientTo, gradientDeg)}
              aria-label="Цвет градиента (начало)"
              style={{
                width: 32,
                height: 26,
                padding: 0,
                border: "1px solid rgba(0,0,0,0.23)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            />
            <input
              type="color"
              value={gradientTo}
              onChange={(e) => {
                const next = e.target.value;
                setGradientTo(next);
                commitGradient(gradientFrom, next, gradientDeg);
              }}
              onBlur={() => commitGradient(gradientFrom, gradientTo, gradientDeg)}
              aria-label="Цвет градиента (конец)"
              style={{
                width: 32,
                height: 26,
                padding: 0,
                border: "1px solid rgba(0,0,0,0.23)",
                borderRadius: 4,
                cursor: "pointer",
              }}
            />
            <Select
              size="small"
              value={gradientDeg}
              onChange={(e) => {
                const deg = Number(e.target.value);
                setGradientDeg(deg);
                commitGradient(gradientFrom, gradientTo, deg);
              }}
              sx={{ minWidth: 56, "& .MuiSelect-select": { py: 0.35 } }}
              aria-label="Направление градиента"
            >
              {GRADIENT_ANGLES.map((item) => (
                <MenuItem key={item.deg} value={item.deg}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
            <Box
              aria-hidden
              sx={{
                flex: 1,
                minWidth: 48,
                height: 26,
                borderRadius: 1,
                border: "1px solid rgba(0,0,0,0.23)",
                background: buildVoteFillGradient(gradientFrom, gradientTo, gradientDeg),
              }}
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
