import { Button, Card, CardContent, Stack, Typography } from "@mui/material";

export type AdminEventDangerTabProps = {
  eventName: string;
  onResetAllAnswers: () => void | Promise<void>;
  onRequestResetDemo: () => void;
};

export function AdminEventDangerTab({
  eventName,
  onResetAllAnswers,
  onRequestResetDemo,
}: AdminEventDangerTabProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" color="error" gutterBottom>
          Опасные действия
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button onClick={() => void onResetAllAnswers()} color="warning" variant="contained">
            Обнулить все ответы
          </Button>
          {eventName === "demo" ? (
            <Button onClick={onRequestResetDemo} color="warning" variant="outlined">
              Вернуть тестовые данные
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
