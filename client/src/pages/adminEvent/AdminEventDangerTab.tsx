import { Button, Card, CardContent, Stack, Typography } from "@mui/material";

export type AdminEventDangerTabProps = {
  onResetAllAnswers: () => void | Promise<void>;
};

export function AdminEventDangerTab({ onResetAllAnswers }: AdminEventDangerTabProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" color="error" gutterBottom>
          Опасные действия
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <Button onClick={() => void onResetAllAnswers()} color="warning" variant="contained">
            Обнулить все ответы
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
