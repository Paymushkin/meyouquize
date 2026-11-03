import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  DEFAULT_NETWORKING_JOIN_FORM_COPY,
  normalizeNetworkingJoinFormMode,
  type NetworkingJoinFormCopy,
  type NetworkingJoinFormFields,
  type NetworkingJoinFormMode,
} from "@meyouquize/shared";

type Props = {
  networkingJoinFormMode: NetworkingJoinFormMode;
  onNetworkingJoinFormModeChange: (mode: NetworkingJoinFormMode) => void;
  networkingJoinFormFields: NetworkingJoinFormFields;
  onNetworkingJoinFormFieldsChange: (fields: NetworkingJoinFormFields) => void;
  networkingJoinFormCopy: NetworkingJoinFormCopy;
  onNetworkingJoinFormCopyChange: (copy: NetworkingJoinFormCopy) => void;
};

type FieldKey = "company" | "offers" | "seeking" | "phone" | "email";

const FIELD_ROWS: {
  key: FieldKey;
  title: string;
  hint: string;
  hasCopy?: boolean;
}[] = [
  { key: "company", title: "Компания", hint: "Организация гостя" },
  { key: "offers", title: "Полезен", hint: "Чем гость может быть полезен", hasCopy: true },
  { key: "seeking", title: "Ищу", hint: "Что гость ищет на ивенте", hasCopy: true },
  { key: "phone", title: "Телефон", hint: "Контакт" },
  { key: "email", title: "Почта", hint: "Контакт" },
];

const MODE_OPTIONS: { value: NetworkingJoinFormMode; label: string; hint: string }[] = [
  { value: "interactive", label: "Интерактивы", hint: "Ник и кнопка случайного имени" },
  { value: "networking", label: "Нетворкинг", hint: "ФИО и настраиваемые поля профиля" },
  { value: "pharma", label: "Фарма", hint: "ФИО, должность и номер аптеки" },
];

function requiredKey(field: FieldKey): keyof NetworkingJoinFormFields {
  return `${field}Required` as keyof NetworkingJoinFormFields;
}

export function AdminJoinAuthSection(props: Props) {
  const {
    networkingJoinFormMode,
    onNetworkingJoinFormModeChange,
    networkingJoinFormFields,
    onNetworkingJoinFormFieldsChange,
    networkingJoinFormCopy,
    onNetworkingJoinFormCopyChange,
  } = props;

  const selectedModeHint = MODE_OPTIONS.find((m) => m.value === networkingJoinFormMode)?.hint ?? "";

  function setFieldEnabled(field: FieldKey, enabled: boolean) {
    onNetworkingJoinFormFieldsChange({
      ...networkingJoinFormFields,
      [field]: enabled,
      [requiredKey(field)]: enabled ? networkingJoinFormFields[requiredKey(field)] : false,
    });
  }

  function setFieldRequired(field: FieldKey, required: boolean) {
    onNetworkingJoinFormFieldsChange({
      ...networkingJoinFormFields,
      [requiredKey(field)]: required,
    });
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Форма входа
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={networkingJoinFormMode}
            onChange={(_, value: NetworkingJoinFormMode | null) => {
              if (value) onNetworkingJoinFormModeChange(normalizeNetworkingJoinFormMode(value));
            }}
            sx={{
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                textTransform: "none",
                flex: "1 1 140px",
              },
            }}
          >
            {MODE_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            {selectedModeHint}
          </Typography>

          {networkingJoinFormMode === "networking" ? (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Поля профиля
              </Typography>
              <Stack spacing={1.25}>
                {FIELD_ROWS.map((row) => {
                  const enabled = networkingJoinFormFields[row.key];
                  const required = Boolean(networkingJoinFormFields[requiredKey(row.key)]);
                  return (
                    <Box
                      key={row.key}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1.25,
                        bgcolor: enabled ? "action.hover" : "transparent",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.hint}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                              <Switch
                                size="small"
                                checked={enabled}
                                onChange={(_, checked) => setFieldEnabled(row.key, checked)}
                              />
                            }
                            label="Показать"
                          />
                          <FormControlLabel
                            sx={{ m: 0 }}
                            disabled={!enabled}
                            control={
                              <Switch
                                size="small"
                                checked={required}
                                onChange={(_, checked) => setFieldRequired(row.key, checked)}
                              />
                            }
                            label="Обяз."
                          />
                        </Stack>
                      </Stack>
                      {enabled && row.hasCopy ? (
                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                          <TextField
                            size="small"
                            label="Название поля"
                            value={
                              row.key === "offers"
                                ? networkingJoinFormCopy.offersLabel
                                : networkingJoinFormCopy.seekingLabel
                            }
                            placeholder={
                              row.key === "offers"
                                ? DEFAULT_NETWORKING_JOIN_FORM_COPY.offersLabel
                                : DEFAULT_NETWORKING_JOIN_FORM_COPY.seekingLabel
                            }
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                ...(row.key === "offers"
                                  ? { offersLabel: e.target.value }
                                  : { seekingLabel: e.target.value }),
                              })
                            }
                          />
                          <TextField
                            size="small"
                            label="Подсказка"
                            value={
                              row.key === "offers"
                                ? networkingJoinFormCopy.offersPlaceholder
                                : networkingJoinFormCopy.seekingPlaceholder
                            }
                            onChange={(e) =>
                              onNetworkingJoinFormCopyChange({
                                ...networkingJoinFormCopy,
                                ...(row.key === "offers"
                                  ? { offersPlaceholder: e.target.value }
                                  : { seekingPlaceholder: e.target.value }),
                              })
                            }
                          />
                        </Stack>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            </>
          ) : null}

          {networkingJoinFormMode === "pharma" || networkingJoinFormMode === "networking" ? (
            <TextField
              size="small"
              fullWidth
              label="Ссылка на документ обработки ПД"
              value={networkingJoinFormCopy.privacyPolicyUrl}
              placeholder="https://…"
              helperText={
                networkingJoinFormCopy.privacyPolicyUrl.trim()
                  ? "Показывается у кнопки «Войти»"
                  : "Пусто — блок согласия не показывается"
              }
              onChange={(e) =>
                onNetworkingJoinFormCopyChange({
                  ...networkingJoinFormCopy,
                  privacyPolicyUrl: e.target.value,
                })
              }
              onBlur={() =>
                onNetworkingJoinFormCopyChange({
                  ...networkingJoinFormCopy,
                  privacyPolicyUrl: networkingJoinFormCopy.privacyPolicyUrl.trim(),
                })
              }
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
