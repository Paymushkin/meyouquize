/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./styles/jost-local.css";
import "./styles/roboto-local.css";
import { QuizPlayPage } from "./pages/QuizPlayPage";
import { ResultsPage } from "./pages/ResultsPage";
import { AdminRoomsPage } from "./pages/AdminRoomsPage";
import { AdminThemesPage } from "./pages/AdminThemesPage";
import { AdminThemeEditorPage } from "./pages/AdminThemeEditorPage";
import { AdminFontsPage } from "./pages/AdminFontsPage";
import { AdminEventRoute } from "./pages/AdminEventRoute";
import { AdminVoteDetailPage } from "./pages/AdminVoteDetailPage";
import { AdminSubQuizResultsPage } from "./pages/AdminSubQuizResultsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { PublicReportPage } from "./pages/PublicReportPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { AdminSectionLayout } from "./components/admin/AdminSectionLayout";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c5acb" },
    secondary: { main: "#22313c" },
    background: {
      default: "#7c5acb",
      paper: "#22313c",
    },
    text: {
      primary: "#ffffff",
      secondary: "#ffffff",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Jost, Arial, sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          position: "relative",
          minHeight: "100vh",
          backgroundColor: "#7c5acb",
          backgroundImage: `
            radial-gradient(circle at 88% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 88% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 92% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 10%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 14%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 18%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 22%, rgba(255,255,255,0.22) 0 3px, transparent 4px),
            radial-gradient(circle at 96% 26%, rgba(255,255,255,0.22) 0 3px, transparent 4px)
          `,
          backgroundAttachment: "fixed",
          overflowX: "hidden",
          "&::before": {
            content: '""',
            position: "fixed",
            left: "-18vw",
            top: "18vh",
            width: "72vw",
            height: "72vw",
            borderRadius: "50%",
            background: "#6749b5",
            zIndex: 0,
          },
          "&::after": {
            content: '""',
            position: "fixed",
            right: "-16vw",
            bottom: "-20vw",
            width: "52vw",
            height: "52vw",
            borderRadius: "50%",
            border: "56px solid rgba(180, 155, 245, 0.32)",
            zIndex: 0,
          },
          "&.mq-no-body-decor": {
            backgroundImage: "none",
            backgroundAttachment: "scroll",
          },
          "&.mq-no-body-decor::before, &.mq-no-body-decor::after": {
            content: "none",
            display: "none",
          },
        },
        "#root": {
          position: "relative",
          zIndex: 1,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/q/:slug" element={<QuizPlayPage />} />
          <Route path="/q/:slug/results" element={<ResultsPage />} />
          <Route path="/p/:slug" element={<ResultsPage />} />
          <Route path="/report/:slug" element={<PublicReportPage />} />
          <Route path="/admin" element={<AdminSectionLayout />}>
            <Route index element={<AdminRoomsPage />} />
            <Route path="themes" element={<AdminThemesPage />} />
            <Route path="themes/:themeId" element={<AdminThemeEditorPage />} />
            <Route path="fonts" element={<AdminFontsPage />} />
            <Route path="admins" element={<AdminUsersPage />} />
            <Route path=":eventName/votes/:questionId" element={<AdminVoteDetailPage />} />
            <Route
              path=":eventName/sub-quizzes/:subQuizId/results"
              element={<AdminSubQuizResultsPage />}
            />
            <Route path=":eventName" element={<AdminEventRoute />} />
          </Route>
          <Route path="/" element={<LandingPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
