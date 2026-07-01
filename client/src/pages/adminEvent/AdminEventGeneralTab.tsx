import { Button, Card, CardContent, Stack } from "@mui/material";
import { AdminGeneralSection } from "../../components/admin/AdminGeneralSection";

export type AdminEventGeneralTabProps = {
  eventName: string;
  editableTitle: string;
  setEditableTitle: (value: string) => void;
  saveQuizTitle: () => void | Promise<void>;
  eventSlug: string;
  showEventTitleOnPlayer: boolean;
  onToggleShowEventTitleOnPlayer: (next: boolean) => void;
  onRequestResetDemo: () => void;
};

export function AdminEventGeneralTab({
  eventName,
  editableTitle,
  setEditableTitle,
  saveQuizTitle,
  eventSlug,
  showEventTitleOnPlayer,
  onToggleShowEventTitleOnPlayer,
  onRequestResetDemo,
}: AdminEventGeneralTabProps) {
  return (
    <Stack spacing={2}>
      <AdminGeneralSection
        editableTitle={editableTitle}
        setEditableTitle={setEditableTitle}
        saveQuizTitle={saveQuizTitle}
        eventSlug={eventSlug}
        showEventTitleOnPlayer={showEventTitleOnPlayer}
        onToggleShowEventTitleOnPlayer={onToggleShowEventTitleOnPlayer}
      />
      {eventName === "demo" && (
        <Card variant="outlined" sx={{ borderColor: "warning.main" }}>
          <CardContent>
            <Button
              variant="outlined"
              color="warning"
              onClick={onRequestResetDemo}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}
            >
              Вернуть тестовые данные
            </Button>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
