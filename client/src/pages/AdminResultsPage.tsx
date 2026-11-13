import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AdminLoginForm } from "../components/AdminLoginForm";
import { AdminResultsSection } from "../components/admin/AdminResultsSection";
import {
  leaderboardPlaceByScore,
  type LeaderboardItem,
  type LeaderboardSort,
  type SubQuizLeaderboardPayload,
} from "../admin/adminEventTypes";
import { API_BASE } from "../config";
import { useAdminAuth } from "../hooks/useAdminAuth";

type LeaderboardsPayload = {
  leaderboard: LeaderboardItem[];
  leaderboardsBySubQuiz: SubQuizLeaderboardPayload[];
};

export function AdminResultsPage() {
  const { eventName = "" } = useParams();
  const { isAuth, authChecked, checkSession } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [leaderboardsBySubQuiz, setLeaderboardsBySubQuiz] = useState<SubQuizLeaderboardPayload[]>(
    [],
  );
  const [resultsSubQuizId, setResultsSubQuizId] = useState("");
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>("place_asc");

  useEffect(() => {
    document.title = eventName ? `Результаты — ${eventName}` : "Результаты — админ";
    void checkSession();
  }, [checkSession, eventName]);

  const loadLeaderboards = useCallback(async (slug: string) => {
    if (!slug) return;
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/rooms/${encodeURIComponent(slug)}/leaderboards`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Не удалось загрузить результаты");
      const payload = (await response.json()) as LeaderboardsPayload;
      const bySub = Array.isArray(payload.leaderboardsBySubQuiz)
        ? payload.leaderboardsBySubQuiz
        : [];
      setLeaderboard(Array.isArray(payload.leaderboard) ? payload.leaderboard : []);
      setLeaderboardsBySubQuiz(bySub);
      setResultsSubQuizId((prev) => {
        if (prev && bySub.some((x) => x.subQuizId === prev)) return prev;
        return bySub[0]?.subQuizId ?? "";
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Не удалось загрузить результаты");
      setLeaderboard([]);
      setLeaderboardsBySubQuiz([]);
      setResultsSubQuizId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuth || !eventName) return;
    void loadLeaderboards(eventName);
  }, [isAuth, eventName, loadLeaderboards]);

  const leaderboardForTable = useMemo(() => {
    const hit = leaderboardsBySubQuiz.find((x) => x.subQuizId === resultsSubQuizId);
    return hit?.rows ?? leaderboard;
  }, [leaderboardsBySubQuiz, resultsSubQuizId, leaderboard]);

  const displayedLeaderboard = useMemo(() => {
    const sorted = [...leaderboardForTable];
    if (leaderboardSort === "place_asc" || leaderboardSort === "place_desc") {
      const placeMap = leaderboardPlaceByScore(leaderboardForTable);
      sorted.sort((a, b) => {
        const pa = placeMap.get(a.participantId) ?? 0;
        const pb = placeMap.get(b.participantId) ?? 0;
        if (pa !== pb) return leaderboardSort === "place_asc" ? pa - pb : pb - pa;
        return a.nickname.localeCompare(b.nickname, "ru");
      });
      return sorted;
    }
    sorted.sort((a, b) => {
      if (leaderboardSort === "score_desc") return b.score - a.score;
      if (leaderboardSort === "score_asc") return a.score - b.score;
      if (leaderboardSort === "name_desc") return b.nickname.localeCompare(a.nickname, "ru");
      return a.nickname.localeCompare(b.nickname, "ru");
    });
    return sorted;
  }, [leaderboardForTable, leaderboardSort]);

  function exportLeaderboardCsv() {
    const placeMap = leaderboardPlaceByScore(displayedLeaderboard);
    const rows = displayedLeaderboard.map((item) => ({
      place: placeMap.get(item.participantId) ?? 0,
      nickname: item.nickname,
      score: item.score,
    }));
    const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const header = ["Место", "Участник", "Баллы"];
    const csvContent = [
      header.map(escapeCsv).join(","),
      ...rows.map((row) => [row.place, row.nickname, row.score].map(escapeCsv).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard-${eventName || "quiz"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
        {loadError ? <Alert severity="error">{loadError}</Alert> : null}
        {loading && leaderboardsBySubQuiz.length === 0 && leaderboard.length === 0 ? (
          <Box sx={{ py: 6, display: "grid", placeItems: "center" }}>
            <CircularProgress size={36} />
          </Box>
        ) : (
          <AdminResultsSection
            leaderboardSort={leaderboardSort}
            setLeaderboardSort={setLeaderboardSort}
            displayedLeaderboard={displayedLeaderboard}
            exportLeaderboardCsv={exportLeaderboardCsv}
            subQuizLeaderboardOptions={leaderboardsBySubQuiz.map((x) => ({
              subQuizId: x.subQuizId,
              title: x.title,
            }))}
            selectedResultsSubQuizId={resultsSubQuizId}
            onSelectResultsSubQuiz={setResultsSubQuizId}
          />
        )}
      </Stack>
    </Container>
  );
}
