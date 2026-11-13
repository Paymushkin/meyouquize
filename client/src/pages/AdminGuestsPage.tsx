import { useEffect } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminNetworkingGuestsPanel } from "../components/admin/AdminNetworkingGuestsPanel";
import { useAdminNetworkingGuests } from "../features/admin/useAdminNetworkingGuests";
import { useAdminAuth } from "../hooks/useAdminAuth";

export function AdminGuestsPage() {
  const { eventName = "" } = useParams();
  const { isAuth, authChecked, checkSession } = useAdminAuth();
  const networking = useAdminNetworkingGuests(eventName, isAuth && Boolean(eventName));

  useEffect(() => {
    document.title = eventName ? `Гости — ${eventName}` : "Гости — админ";
    void checkSession();
  }, [checkSession, eventName]);

  if (!authChecked) return null;

  if (!isAuth) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom>
          Админ
        </Typography>
        <AdminLoginForm onSuccess={() => void checkSession()} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Button
          component={RouterLink}
          to={`/admin/${encodeURIComponent(eventName)}`}
          startIcon={<ArrowBackIcon />}
          variant="text"
          sx={{ alignSelf: "flex-start" }}
        >
          К ивенту
        </Button>
        <Card variant="outlined">
          <CardContent>
            <AdminNetworkingGuestsPanel networking={networking} title="Гости" />
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
