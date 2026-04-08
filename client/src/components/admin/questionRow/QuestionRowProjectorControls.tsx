import {
  Box,
  FormControlLabel,
  Switch,
  TextField,
  Tooltip,
} from "@mui/material";

type Props = {
  projectorShowFirstCorrect: boolean;
  projectorFirstCorrectWinnersCount: number;
  onProjectorShowFirstCorrectChange: (next: boolean) => void;
  onWinnersCountPatch: (next: number) => void;
  onWinnersCountCommit: (raw: number) => void;
};

/** Компактные настройки «победители на проекторе» в раскрытой карточке вопроса. */
export function QuestionRowProjectorControls(props: Props) {
  const {
    projectorShowFirstCorrect,
    projectorFirstCorrectWinnersCount,
    onProjectorShowFirstCorrectChange,
    onWinnersCountPatch,
    onWinnersCountCommit,
  } = props;

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.75,
        py: 0.25,
      }}
    >
      <Tooltip title="Кубок в строке вопроса. В редакторе отметьте верный вариант.">
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={projectorShowFirstCorrect}
              onChange={(_e, checked) => {
                onProjectorShowFirstCorrectChange(checked);
              }}
            />
          )}
          label="Победители"
          sx={{
            m: 0,
            mr: 0,
            ml: 0,
            gap: 0.5,
            "& .MuiFormControlLabel-label": { fontSize: "0.8125rem" },
          }}
        />
      </Tooltip>
      <TextField
        type="number"
        size="small"
        hiddenLabel
        placeholder="1–20"
        disabled={!projectorShowFirstCorrect}
        value={projectorFirstCorrectWinnersCount}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return;
          const v = Number(raw);
          if (!Number.isFinite(v)) return;
          onWinnersCountPatch(Math.max(1, Math.min(20, Math.trunc(v))));
        }}
        onBlur={(e) => {
          const raw = e.target.value;
          const v = raw === "" ? 1 : Number(raw);
          onWinnersCountCommit(Number.isFinite(v) ? v : 1);
        }}
        sx={{ width: 72, "& input": { py: 0.65, textAlign: "center" } }}
        inputProps={{
          min: 1,
          max: 20,
          "aria-label": "Сколько победителей на проекторе (1–20)",
        }}
        title="Сколько показывать (1–20)"
      />
    </Box>
  );
}
