import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { isReservedAdminEventName } from "../features/admin/reservedAdminSegments";
import { AdminFontsPage } from "./AdminFontsPage";
import { AdminThemesPage } from "./AdminThemesPage";

const AdminEventPage = lazy(() =>
  import("./AdminEventPage").then((module) => ({ default: module.AdminEventPage })),
);

export function AdminEventRoute() {
  const { eventName } = useParams();

  if (eventName === "fonts") {
    return <AdminFontsPage />;
  }
  if (eventName === "themes") {
    return <AdminThemesPage />;
  }
  if (isReservedAdminEventName(eventName)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AdminEventPage />
    </Suspense>
  );
}
