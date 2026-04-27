import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import PhoneDisabledIcon from "@mui/icons-material/PhoneDisabled";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import { IconButton, Stack, Tooltip } from "@mui/material";
import type { MouseEvent } from "react";

type Props = {
  questionType: "single" | "multi" | "tag_cloud" | "ranking";
  questionOnProjector: boolean;
  chartsOnProjector: boolean;
  winnersOnProjector: boolean;
  revealButtonVisible: boolean;
  revealResultsOnProjector: boolean;
  showTrophyButton: boolean;
  questionActive: boolean;
  settingsExpanded: boolean;
  onSlideshow: (e: MouseEvent<HTMLButtonElement>) => void;
  onTrophy: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleActive: (e: MouseEvent<HTMLButtonElement>) => void;
  onToggleSettings: (e: MouseEvent<HTMLButtonElement>) => void;
  onRevealResults: (e: MouseEvent<HTMLButtonElement>) => void;
};

/** Кнопки справа в строке списка вопросов (проектор, кубок, активность, настройки). */
export function QuestionRowQuickActions(props: Props) {
  const {
    questionType,
    questionOnProjector,
    chartsOnProjector,
    winnersOnProjector,
    revealButtonVisible,
    revealResultsOnProjector,
    showTrophyButton,
    questionActive,
    settingsExpanded,
    onSlideshow,
    onTrophy,
    onToggleActive,
    onToggleSettings,
    onRevealResults,
  } = props;
  const revealTitle =
    questionType === "tag_cloud"
      ? revealResultsOnProjector
        ? "Скрыть облако тегов"
        : "Показать облако тегов"
      : revealResultsOnProjector
        ? "Скрыть графики и проценты"
        : "Показать графики и проценты";

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
          chartsOnProjector ? "Скрыть вопрос с экрана" : "Показать вопрос и варианты на экране"
        }
      >
        <span>
          <IconButton
            size="small"
            color={chartsOnProjector ? "primary" : "default"}
            onClick={onSlideshow}
            aria-label={
              chartsOnProjector ? "Скрыть вопрос с экрана" : "Показать вопрос и варианты на экране"
            }
            aria-pressed={chartsOnProjector}
          >
            {chartsOnProjector ? (
              <SlideshowIcon fontSize="small" />
            ) : (
              <SlideshowOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {revealButtonVisible ? (
        <Tooltip title={revealTitle}>
          <span>
            <IconButton
              size="small"
              color={revealResultsOnProjector ? "success" : "default"}
              onClick={onRevealResults}
              aria-label={revealTitle}
              aria-pressed={revealResultsOnProjector}
            >
              <BarChartIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      {showTrophyButton ? (
        <Tooltip
          title={
            winnersOnProjector ? "Скрыть победителя на экране" : "Показать победителя на экране"
          }
        >
          <span>
            <IconButton
              size="small"
              color={winnersOnProjector ? "warning" : "default"}
              onClick={onTrophy}
              aria-label={
                winnersOnProjector ? "Скрыть победителя на экране" : "Показать победителя на экране"
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
      <Tooltip
        title={questionActive ? "Отключить вопрос (не принимать ответы)" : "Включить вопрос"}
      >
        <span>
          <IconButton
            size="small"
            color={questionActive ? "warning" : "default"}
            onClick={onToggleActive}
            aria-label={questionActive ? "Отключить вопрос" : "Включить вопрос"}
          >
            {questionActive ? (
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
          aria-label={
            settingsExpanded ? "Свернуть настройки вопроса" : "Раскрыть настройки вопроса"
          }
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
