import { useCallback, useState } from "react";
import { API_BASE } from "../config";

export function useAdminAuth() {
  const [isAuth, setIsAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/me`, { credentials: "include" });
      const ok = response.ok;
      setIsAuth(ok);
      return ok;
    } catch {
      setIsAuth(false);
      return false;
    } finally {
      setAuthChecked(true);
    }
  }, []);

  return { isAuth, setIsAuth, authChecked, checkSession };
}
