import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import RestoreIcon from "@mui/icons-material/Restore";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";

type Props = {
  count: number;
  hasOverride: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  onRestore: () => void;
};

export function VoteCountAdjustControls({
  count,
  hasOverride,
  onDecrement,
  onIncrement,
  onRestore,
}: Props) {
  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {hasOverride ? (
        <Tooltip title="Восстановить реальные результаты">
          <IconButton
            size="small"
            onClick={onRestore}
            aria-label="Восстановить реальные результаты"
          >
            <RestoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <IconButton size="small" onClick={onDecrement} aria-label="Уменьшить число голосов">
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
        {count}
      </Typography>
      <IconButton size="small" onClick={onIncrement} aria-label="Увеличить число голосов">
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
