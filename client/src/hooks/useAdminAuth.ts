import { useCallback, useState } from "react";
import { API_BASE } from "../config";

export type AdminMe = {
  id: string;
  login: string;
  role: "SUPER_ADMIN" | "ADMIN";
};

export function useAdminAuth() {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [admin, setAdmin] = useState<AdminMe | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
      const ok = response.ok;
      setIsAuth(ok);
      if (ok) {
        const payload = (await response.json()) as { admin?: AdminMe };
        setAdmin(payload.admin ?? null);
      } else {
        setAdmin(null);
      }
      return ok;
    } catch {
      setIsAuth(false);
      setAdmin(null);
      return false;
    } finally {
      setAuthChecked(true);
    }
  }, []);

  return { isAuth, setIsAuth, authChecked, admin, checkSession };
}
