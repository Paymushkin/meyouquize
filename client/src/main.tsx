/* eslint-disable react-refresh/only-export-components */
import React, { lazy, Suspense, useEffect } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/unbounded/800.css";
import { LandingPage } from "./pages/LandingPage";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const QuizPlayPage = lazy(() =>
  import("./pages/QuizPlayPage").then((m) => ({ default: m.QuizPlayPage })),
);
const ResultsPage = lazy(() =>
  import("./pages/ResultsPage").then((m) => ({ default: m.ResultsPage })),
);
const AdminRoomsPage = lazy(() =>
  import("./pages/AdminRoomsPage").then((m) => ({ default: m.AdminRoomsPage })),
);
const AdminThemesPage = lazy(() =>
  import("./pages/AdminThemesPage").then((m) => ({ default: m.AdminThemesPage })),
);
const AdminThemeEditorPage = lazy(() =>
  import("./pages/AdminThemeEditorPage").then((m) => ({ default: m.AdminThemeEditorPage })),
);
const AdminFontsPage = lazy(() =>
  import("./pages/AdminFontsPage").then((m) => ({ default: m.AdminFontsPage })),
);
const AdminGuestsPage = lazy(() =>
  import("./pages/AdminGuestsPage").then((m) => ({ default: m.AdminGuestsPage })),
);
const AdminResultsPage = lazy(() =>
  import("./pages/AdminResultsPage").then((m) => ({ default: m.AdminResultsPage })),
);
const AdminEventRoute = lazy(() =>
  import("./pages/AdminEventRoute").then((m) => ({ default: m.AdminEventRoute })),
);
const AdminVoteDetailPage = lazy(() =>
  import("./pages/AdminVoteDetailPage").then((m) => ({ default: m.AdminVoteDetailPage })),
);
const AdminSubQuizResultsPage = lazy(() =>
  import("./pages/AdminSubQuizResultsPage").then((m) => ({ default: m.AdminSubQuizResultsPage })),
);
const AdminUsersPage = lazy(() =>
  import("./pages/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })),
);
const PublicReportPage = lazy(() =>
  import("./pages/PublicReportPage").then((m) => ({ default: m.PublicReportPage })),
);
const LandingPrivacyPage = lazy(() =>
  import("./pages/landing/LandingLegalPage").then((m) => ({ default: m.LandingPrivacyPage })),
);
const LandingCookiesPage = lazy(() =>
  import("./pages/landing/LandingLegalPage").then((m) => ({ default: m.LandingCookiesPage })),
);
const LandingAboutPage = lazy(() =>
  import("./pages/landing/LandingTrustPage").then((m) => ({ default: m.LandingAboutPage })),
);
const LandingContactPage = lazy(() =>
  import("./pages/landing/LandingTrustPage").then((m) => ({ default: m.LandingContactPage })),
);
const LandingInteractivesPage = lazy(() =>
  import("./pages/landing/LandingMarketingPage").then((m) => ({
    default: m.LandingInteractivesPage,
  })),
);
const LandingFlashInterviewPage = lazy(() =>
  import("./pages/landing/LandingMarketingPage").then((m) => ({
    default: m.LandingFlashInterviewPage,
  })),
);
const LandingConferencePage = lazy(() =>
  import("./pages/landing/LandingMarketingPage").then((m) => ({
    default: m.LandingConferencePage,
  })),
);
const LandingCorporatePage = lazy(() =>
  import("./pages/landing/LandingMarketingPage").then((m) => ({
    default: m.LandingCorporatePage,
  })),
);
const LandingPharmaPage = lazy(() =>
  import("./pages/landing/LandingMarketingPage").then((m) => ({ default: m.LandingPharmaPage })),
);
const SpeakerModeratorPage = lazy(() =>
  import("./pages/SpeakerModeratorPage").then((m) => ({ default: m.SpeakerModeratorPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const ForbiddenPage = lazy(() =>
  import("./pages/ForbiddenPage").then((m) => ({ default: m.ForbiddenPage })),
);
const AdminSectionLayout = lazy(() =>
  import("./components/admin/AdminSectionLayout").then((m) => ({ default: m.AdminSectionLayout })),
);

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

function PurpleAppShell() {
  useEffect(() => {
    void import("./styles/jost-local.css");
    void import("./styles/roboto-local.css");
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/interactives"
          element={
            <Suspense fallback={null}>
              <LandingInteractivesPage />
            </Suspense>
          }
        />
        <Route
          path="/flash-interview"
          element={
            <Suspense fallback={null}>
              <LandingFlashInterviewPage />
            </Suspense>
          }
        />
        <Route
          path="/conference"
          element={
            <Suspense fallback={null}>
              <LandingConferencePage />
            </Suspense>
          }
        />
        <Route
          path="/corporate"
          element={
            <Suspense fallback={null}>
              <LandingCorporatePage />
            </Suspense>
          }
        />
        <Route
          path="/pharma"
          element={
            <Suspense fallback={null}>
              <LandingPharmaPage />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={null}>
              <LandingPrivacyPage />
            </Suspense>
          }
        />
        <Route
          path="/cookies"
          element={
            <Suspense fallback={null}>
              <LandingCookiesPage />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={null}>
              <LandingAboutPage />
            </Suspense>
          }
        />
        <Route
          path="/contact"
          element={
            <Suspense fallback={null}>
              <LandingContactPage />
            </Suspense>
          }
        />
        <Route element={<PurpleAppShell />}>
          <Route path="/q/:slug" element={<QuizPlayPage />} />
          <Route path="/q/:slug/results" element={<ResultsPage />} />
          <Route path="/p/:slug" element={<ResultsPage />} />
          <Route path="/s/:slug" element={<SpeakerModeratorPage />} />
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
            <Route path=":eventName/guests" element={<AdminGuestsPage />} />
            <Route path=":eventName/results" element={<AdminResultsPage />} />
            <Route path=":eventName" element={<AdminEventRoute />} />
          </Route>
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

const rootEl = document.getElementById("root")!;
const appTree = (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
// Prerendered landing ships markup in #root → hydrate; empty shell (dev / spa.html) → createRoot.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, appTree);
} else {
  createRoot(rootEl).render(appTree);
}
