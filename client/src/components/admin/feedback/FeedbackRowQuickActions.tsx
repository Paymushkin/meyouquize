import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import { IconButton, Stack, Tooltip } from "@mui/material";
import type { MouseEvent } from "react";

type Props = {
  formActive: boolean;
  settingsExpanded: boolean;
  onToggleActive: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleSettings: (e: MouseEvent<HTMLButtonElement>) => void;
};

export function FeedbackRowQuickActions(props: Props) {
  const { formActive, settingsExpanded, onToggleActive, onToggleSettings } = props;

  return (
    <Stack
      direction="row"
      spacing={0.25}
      alignItems="center"
      flexShrink={0}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip
        title={
          formActive
            ? "Отключить форму на телефонах (закрыть приём)"
            : "Включить форму на телефонах"
        }
      >
        <span>
          <IconButton
            size="small"
            color={formActive ? "warning" : "default"}
            onClick={onToggleActive}
            aria-label={formActive ? "Отключить форму на телефонах" : "Включить форму на телефонах"}
          >
            {formActive ? (
              <PhoneIphoneIcon fontSize="small" />
            ) : (
              <PhoneDisabledIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={settingsExpanded ? "Свернуть настройки и результаты" : "Настройки и результаты"}
      >
        <IconButton
          size="small"
          onClick={onToggleSettings}
          color={settingsExpanded ? "primary" : "default"}
          aria-expanded={settingsExpanded}
          aria-label={settingsExpanded ? "Свернуть настройки формы" : "Раскрыть настройки формы"}
        >
          {settingsExpanded ? (
            <SettingsIcon fontSize="small" />
          ) : (
            <SettingsOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
