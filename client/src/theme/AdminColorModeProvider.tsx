import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  ADMIN_COLOR_MODE_STORAGE_KEY,
  isAdminColorMode,
  readStoredAdminColorMode,
  writeStoredAdminColorMode,
  type AdminColorMode,
} from "./adminColorMode";
import { createAdminAppTheme } from "./createAdminAppTheme";

type AdminColorModeContextValue = {
  mode: AdminColorMode;
  setMode: (mode: AdminColorMode) => void;
};

const AdminColorModeContext = createContext<AdminColorModeContextValue | null>(null);

export function AdminColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AdminColorMode>(() =>
    typeof window === "undefined" ? "dark" : readStoredAdminColorMode(),
  );

  const setMode = useCallback((next: AdminColorMode) => {
    setModeState(next);
    writeStoredAdminColorMode(next);
  }, []);

  // Дублируем запись при любом изменении mode (в т.ч. если setState вызовут иначе).
  useEffect(() => {
    writeStoredAdminColorMode(mode);
  }, [mode]);

  // Синхронизация между вкладками того же браузера.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== ADMIN_COLOR_MODE_STORAGE_KEY) return;
      if (isAdminColorMode(event.newValue)) {
        setModeState(event.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const theme = useMemo(() => createAdminAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <AdminColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AdminColorModeContext.Provider>
  );
}

export function useAdminColorMode(): AdminColorModeContextValue {
  const ctx = useContext(AdminColorModeContext);
  if (!ctx) {
    throw new Error("useAdminColorMode must be used within AdminColorModeProvider");
  }
  return ctx;
}
