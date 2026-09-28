import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { geoPollDictionaryInputLabel } from "@meyouquize/shared";
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../config";

export type GeoPollOption = {
  key: string;
  label: string;
  lat: number;
  lon: number;
};

type PlayerGeoPollAutocompleteProps = {
  dictionaryId: string;
  value: GeoPollOption | null;
  disabled?: boolean;
  brandPrimaryColor: string;
  onChange: (value: GeoPollOption | null) => void;
};

export function PlayerGeoPollAutocomplete({
  dictionaryId,
  value,
  disabled = false,
  brandPrimaryColor,
  onChange,
}: PlayerGeoPollAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const [options, setOptions] = useState<GeoPollOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputValue(value?.label ?? "");
  }, [value?.key, value?.label]);

  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          dictionary: dictionaryId,
          q: inputValue,
          limit: "20",
        });
        const response = await fetch(`${API_BASE}/api/geo-poll/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setOptions([]);
          return;
        }
        const data = (await response.json()) as { items: GeoPollOption[] };
        setOptions(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [dictionaryId, disabled, inputValue]);

  const selectedOption = useMemo(
    () => options.find((option) => option.key === value?.key) ?? value,
    [options, value],
  );

  return (
    <Autocomplete
      freeSolo={false}
      options={options}
      value={selectedOption}
      inputValue={inputValue}
      disabled={disabled}
      loading={loading}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.key === b.key}
      onInputChange={(_event, nextInput) => setInputValue(nextInput)}
      onChange={(_event, nextValue) => onChange(nextValue)}
      filterOptions={(items) => items}
      noOptionsText={loading ? "Поиск…" : "Нет совпадений в словаре"}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={`Начните вводить ${geoPollDictionaryInputLabel(dictionaryId).toLowerCase()}`}
          size="small"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
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
            "& .MuiInputBase-input::placeholder": {
              color: "rgba(255,255,255,0.55)",
              opacity: 1,
            },
          }}
        />
      )}
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#1f1f1f",
            color: "#fff",
          },
        },
      }}
    />
  );
}
