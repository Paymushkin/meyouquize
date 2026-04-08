import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import { IconButton, Stack, Tooltip } from "@mui/material";
import type { MouseEvent } from "react";

type Props = {
  chartsOnProjector: boolean;
  winnersOnProjector: boolean;
  showTrophyButton: boolean;
  questionActive: boolean;
  settingsExpanded: boolean;
  onSlideshow: (e: MouseEvent<HTMLButtonElement>) => void;
  onTrophy: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleActive: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleSettings: (e: MouseEvent<HTMLButtonElement>) => void;
};

/** Кнопки справа в строке списка вопросов (проектор, кубок, активность, настройки). */
export function QuestionRowQuickActions(props: Props) {
  const {
    chartsOnProjector,
    winnersOnProjector,
    showTrophyButton,
    questionActive,
    settingsExpanded,
    onSlideshow,
    onTrophy,
    onToggleActive,
    onToggleSettings,
  } = props;

  return (
    <Stack direction="row" spacing={0.25} alignItems="center" flexShrink={0} onClick={(e) => e.stopPropagation()}>
      <Tooltip
        title={
          chartsOnProjector
            ? "Скрыть результаты на экране"
            : "Показать результаты на экране (график, без блока победителя)"
        }
      >
        <span>
          <IconButton
            size="small"
            color={chartsOnProjector ? "primary" : "default"}
            onClick={onSlideshow}
            aria-label="Показать или скрыть результаты на экране"
          >
            {chartsOnProjector ? (
              <SlideshowIcon fontSize="small" />
            ) : (
              <SlideshowOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {showTrophyButton ? (
        <Tooltip
          title={
            winnersOnProjector
              ? "Скрыть победителя на экране"
              : "Показать победителя на экране"
          }
        >
          <span>
            <IconButton
              size="small"
              color={winnersOnProjector ? "warning" : "default"}
              onClick={onTrophy}
              aria-label={
                winnersOnProjector
                  ? "Скрыть победителя на экране"
                  : "Показать победителя на экране"
              }
              aria-pressed={winnersOnProjector}
            >
              {winnersOnProjector ? (
                <EmojiEventsIcon fontSize="small" />
              ) : (
                <EmojiEventsOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      <Tooltip title={questionActive ? "Отключить вопрос (не принимать ответы)" : "Включить вопрос"}>
        <span>
          <IconButton
            size="small"
            color={questionActive ? "warning" : "default"}
            onClick={onToggleActive}
            aria-label={questionActive ? "Отключить вопрос" : "Включить вопрос"}
          >
            {questionActive ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={settingsExpanded ? "Свернуть настройки и результаты" : "Настройки и результаты"}>
        <IconButton
          size="small"
          onClick={onToggleSettings}
          color={settingsExpanded ? "primary" : "default"}
          aria-expanded={settingsExpanded}
          aria-label={settingsExpanded ? "Свернуть настройки вопроса" : "Раскрыть настройки вопроса"}
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
