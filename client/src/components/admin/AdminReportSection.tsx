import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DownloadIcon from "@mui/icons-material/Download";
import LaunchIcon from "@mui/icons-material/Launch";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ReportModuleId } from "@meyouquize/shared";
import type { RandomizerHistoryEntry } from "../../features/randomizer/randomizerLogic";
import type { SpeakerQuestionItem } from "../../types/speakerQuestions";

type ReactionWidgetLite = { id: string; title: string };

type Props = {
  reportTitle: string;
  onReportTitleChange: (next: string) => void;
  onReportTitleCommit: () => void;
  reportModules: ReportModuleId[];
  onToggleModule: (moduleId: ReportModuleId, enabled: boolean) => void;
  onMoveModule: (moduleId: ReportModuleId, direction: -1 | 1) => void;
  availableQuizQuestions: Array<{
    subQuizId: string;
    subQuizTitle: string;
    questions: Array<{ id: string; text: string }>;
  }>;
  selectedQuizIds: string[];
  selectedQuizQuestionIds: string[];
  onToggleQuiz: (subQuizId: string, enabled: boolean) => void;
  onToggleQuizQuestion: (questionId: string, enabled: boolean) => void;
  reportSubQuizHideParticipantTableIds: string[];
  onToggleSubQuizParticipantTable: (subQuizId: string, enabled: boolean) => void;
  randomizerHistory: RandomizerHistoryEntry[];
  randomizerCurrentWinners: string[];
  reportRandomizerRunIds: string[];
  onToggleRandomizerRun: (runId: string, enabled: boolean) => void;
  reactionWidgets: ReactionWidgetLite[];
  reportReactionsWidgetIds: string[];
  onToggleReactionsWidget: (widgetId: string, enabled: boolean) => void;
  speakerQuestionsForReport: SpeakerQuestionItem[];
  reportSpeakerQuestionIds: string[];
  onToggleSpeakerQuestion: (questionId: string, enabled: boolean) => void;
  availableVoteQuestions: Array<{ id: string; text: string }>;
  selectedVoteQuestionIds: string[];
  onToggleVoteQuestion: (questionId: string, enabled: boolean) => void;
  reportPublished: boolean;
  onTogglePublished: (next: boolean) => void;
  publicReportUrl: string;
  pdfReportUrl: string;
};

const MODULE_LABELS: Record<ReportModuleId, string> = {
  event_header: "Шапка события",
  participation_summary: "Итоги участия",
  quiz_results: "Результаты квизов",
  vote_results: "Результаты голосований",
  reactions_summary: "Реакции аудитории",
  randomizer_summary: "Итоги рандомайзера",
  speaker_questions_summary: "Вопросы спикерам",
};

const ALL_MODULES: ReportModuleId[] = [
  "event_header",
  "participation_summary",
  "quiz_results",
  "vote_results",
  "reactions_summary",
  "randomizer_summary",
  "speaker_questions_summary",
];

function allRandomizerRunIds(
  history: RandomizerHistoryEntry[],
  currentWinners: string[],
): string[] {
  const ids = history.map((_, i) => `history:${i}`);
  if (currentWinners.length > 0) ids.push("current");
  return ids;
}

export function AdminReportSection(props: Props) {
  const {
    reportTitle,
    onReportTitleChange,
    onReportTitleCommit,
    reportModules,
    onToggleModule,
    onMoveModule,
    availableQuizQuestions,
    selectedQuizIds,
    selectedQuizQuestionIds,
    onToggleQuiz,
    onToggleQuizQuestion,
    reportSubQuizHideParticipantTableIds,
    onToggleSubQuizParticipantTable,
    randomizerHistory,
    randomizerCurrentWinners,
    reportRandomizerRunIds,
    onToggleRandomizerRun,
    reactionWidgets,
    reportReactionsWidgetIds,
    onToggleReactionsWidget,
    speakerQuestionsForReport,
    reportSpeakerQuestionIds,
    onToggleSpeakerQuestion,
    availableVoteQuestions,
    selectedVoteQuestionIds,
    onToggleVoteQuestion,
    reportPublished,
    onTogglePublished,
    publicReportUrl,
    pdfReportUrl,
  } = props;

  const randomizerAllIds = allRandomizerRunIds(randomizerHistory, randomizerCurrentWinners);
  const randomizerEffective =
    reportRandomizerRunIds.length === 0
      ? randomizerAllIds
      : reportRandomizerRunIds.filter((id) => randomizerAllIds.includes(id));

  const reactionAllIds = reactionWidgets.map((w) => w.id);
  const reactionEffective =
    reportReactionsWidgetIds.length === 0
      ? reactionAllIds
      : reportReactionsWidgetIds.filter((id) => reactionAllIds.includes(id));

  const speakerAllIds = speakerQuestionsForReport.map((q) => q.id);
  const speakerEffective =
    reportSpeakerQuestionIds.length === 0
      ? speakerAllIds
      : reportSpeakerQuestionIds.filter((id) => speakerAllIds.includes(id));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Отчет после мероприятия</Typography>
          <TextField
            label="Заголовок отчета"
            size="small"
            value={reportTitle}
            onChange={(e) => onReportTitleChange(e.target.value)}
            onBlur={onReportTitleCommit}
          />

          <Stack spacing={1}>
            <Typography variant="subtitle2">Модули отчета</Typography>
            {ALL_MODULES.map((moduleId) => {
              const checked = reportModules.includes(moduleId);
              const index = reportModules.indexOf(moduleId);
              const canMoveUp = checked && index > 0;
              const canMoveDown = checked && index >= 0 && index < reportModules.length - 1;
              return (
                <Stack
                  key={moduleId}
                  spacing={1}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checked}
                          onChange={(e) => onToggleModule(moduleId, e.target.checked)}
                        />
                      }
                      label={MODULE_LABELS[moduleId]}
                    />
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => onMoveModule(moduleId, -1)}
                        disabled={!canMoveUp}
                        aria-label="Поднять модуль"
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onMoveModule(moduleId, 1)}
                        disabled={!canMoveDown}
                        aria-label="Опустить модуль"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {checked && moduleId === "vote_results" && (
                    <Box
                      sx={{
                        ml: { xs: 0, sm: 5 },
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        pl: 1.5,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Какие голосования показывать</Typography>
                        {availableVoteQuestions.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            В событии пока нет голосований
                          </Typography>
                        ) : (
                          availableVoteQuestions.map((question) => {
                            const voteChecked =
                              selectedVoteQuestionIds.length === 0 ||
                              selectedVoteQuestionIds.includes(question.id);
                            return (
                              <FormControlLabel
                                key={question.id}
                                control={
                                  <Checkbox
                                    checked={voteChecked}
                                    onChange={(e) =>
                                      onToggleVoteQuestion(question.id, e.target.checked)
                                    }
                                  />
                                }
                                label={question.text}
                              />
                            );
                          })
                        )}
                      </Stack>
                    </Box>
                  )}

                  {checked && moduleId === "quiz_results" && (
                    <Box
                      sx={{
                        ml: { xs: 0, sm: 5 },
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        pl: 1.5,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Какие квизы показывать</Typography>
                        {availableQuizQuestions.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            В событии пока нет квизов
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {availableQuizQuestions.map((group) => {
                              const groupEnabled =
                                selectedQuizIds.length === 0 ||
                                selectedQuizIds.includes(group.subQuizId);
                              const checkedQuestionsInGroup = group.questions.filter((question) =>
                                selectedQuizQuestionIds.includes(question.id),
                              ).length;
                              const questionsIndeterminate =
                                groupEnabled &&
                                selectedQuizQuestionIds.length > 0 &&
                                checkedQuestionsInGroup > 0 &&
                                checkedQuestionsInGroup < group.questions.length;
                              return (
                                <Box key={group.subQuizId} sx={{ borderRadius: 1, p: 0.5 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={groupEnabled}
                                        indeterminate={questionsIndeterminate}
                                        onChange={(e) =>
                                          onToggleQuiz(group.subQuizId, e.target.checked)
                                        }
                                      />
                                    }
                                    label={`Квиз: ${group.subQuizTitle}`}
                                  />
                                  <Box sx={{ pl: { xs: 0, sm: 5 } }}>
                                    <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                                      Какие вопросы показывать
                                    </Typography>
                                    <Stack spacing={0.25}>
                                      {group.questions.map((question, idx) => {
                                        const questionChecked =
                                          groupEnabled &&
                                          (selectedQuizQuestionIds.length === 0 ||
                                            selectedQuizQuestionIds.includes(question.id));
                                        return (
                                          <FormControlLabel
                                            key={question.id}
                                            control={
                                              <Checkbox
                                                checked={questionChecked}
                                                disabled={!groupEnabled}
                                                onChange={(e) =>
                                                  onToggleQuizQuestion(
                                                    question.id,
                                                    e.target.checked,
                                                  )
                                                }
                                              />
                                            }
                                            label={`#${idx + 1} ${question.text}`}
                                          />
                                        );
                                      })}
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={
                                              groupEnabled &&
                                              !reportSubQuizHideParticipantTableIds.includes(
                                                group.subQuizId,
                                              )
                                            }
                                            disabled={!groupEnabled}
                                            onChange={(e) =>
                                              onToggleSubQuizParticipantTable(
                                                group.subQuizId,
                                                e.target.checked,
                                              )
                                            }
                                          />
                                        }
                                        label="Таблица результатов участников (как в админке)"
                                      />
                                    </Stack>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {checked && moduleId === "randomizer_summary" && (
                    <Box
                      sx={{
                        ml: { xs: 0, sm: 5 },
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        pl: 1.5,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Какие запуски показывать</Typography>
                        {randomizerHistory.length === 0 && randomizerCurrentWinners.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            История рандомайзера пока пуста
                          </Typography>
                        ) : (
                          <Stack spacing={0.25}>
                            {randomizerHistory.map((entry, index) => {
                              const runId = `history:${index}`;
                              const runChecked = randomizerEffective.includes(runId);
                              const preview = entry.winners.slice(0, 4).join(", ");
                              const label =
                                (entry.timestamp?.trim() || `Запуск ${index + 1}`) +
                                (preview
                                  ? ` — ${preview}${entry.winners.length > 4 ? "…" : ""}`
                                  : "");
                              return (
                                <FormControlLabel
                                  key={runId}
                                  control={
                                    <Checkbox
                                      checked={runChecked}
                                      onChange={(e) =>
                                        onToggleRandomizerRun(runId, e.target.checked)
                                      }
                                    />
                                  }
                                  label={label}
                                />
                              );
                            })}
                            {randomizerCurrentWinners.length > 0 ? (
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={randomizerEffective.includes("current")}
                                    onChange={(e) =>
                                      onToggleRandomizerRun("current", e.target.checked)
                                    }
                                  />
                                }
                                label="Текущие победители (последний запуск)"
                              />
                            ) : null}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {checked && moduleId === "reactions_summary" && (
                    <Box
                      sx={{
                        ml: { xs: 0, sm: 5 },
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        pl: 1.5,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Какие виджеты показывать</Typography>
                        {reactionWidgets.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Виджеты реакций пока не настроены
                          </Typography>
                        ) : (
                          reactionWidgets.map((widget) => {
                            const wChecked = reactionEffective.includes(widget.id);
                            return (
                              <FormControlLabel
                                key={widget.id}
                                control={
                                  <Checkbox
                                    checked={wChecked}
                                    onChange={(e) =>
                                      onToggleReactionsWidget(widget.id, e.target.checked)
                                    }
                                  />
                                }
                                label={widget.title?.trim() || "Виджет без названия"}
                              />
                            );
                          })
                        )}
                      </Stack>
                    </Box>
                  )}

                  {checked && moduleId === "speaker_questions_summary" && (
                    <Box
                      sx={{
                        ml: { xs: 0, sm: 5 },
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        pl: 1.5,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="subtitle2">Какие вопросы показывать</Typography>
                        {speakerQuestionsForReport.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Вопросов спикерам пока нет — откройте секцию «Вопросы спикерам», чтобы
                            подгрузить список
                          </Typography>
                        ) : (
                          speakerQuestionsForReport.map((q) => {
                            const qChecked = speakerEffective.includes(q.id);
                            const short =
                              (q.text || "").replace(/\s+/g, " ").trim().slice(0, 100) +
                              ((q.text || "").length > 100 ? "…" : "");
                            return (
                              <FormControlLabel
                                key={q.id}
                                control={
                                  <Checkbox
                                    checked={qChecked}
                                    onChange={(e) =>
                                      onToggleSpeakerQuestion(q.id, e.target.checked)
                                    }
                                  />
                                }
                                label={`[${q.speakerName}] ${short}`}
                              />
                            );
                          })
                        )}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              );
            })}
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Stack direction="row" spacing={0.5}>
              <Tooltip
                title={reportPublished ? "Скрыть публичный отчет" : "Опубликовать публичный отчет"}
              >
                <span>
                  <IconButton
                    color={reportPublished ? "primary" : "default"}
                    onClick={() => onTogglePublished(!reportPublished)}
                    aria-label={
                      reportPublished ? "Скрыть публичный отчет" : "Опубликовать публичный отчет"
                    }
                  >
                    {reportPublished ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Открыть отчет">
                <span>
                  <IconButton
                    component="a"
                    href={publicReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    disabled={!reportPublished}
                    aria-label="Открыть отчет"
                  >
                    <LaunchIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Скачать отчет PDF">
                <span>
                  <IconButton
                    component="a"
                    href={pdfReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    disabled={!reportPublished}
                    aria-label="Скачать отчет PDF"
                  >
                    <DownloadIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
