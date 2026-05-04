import { Buffer } from "node:buffer";

export type AdminAccount = { login: string; password: string };

/**
 * JSON из `ADMIN_ACCOUNTS_BASE64` (UTF-8), если в пароле есть `$`, `!` и т.п. —
 * так надёжнее, чем одна строка в `.env` (systemd/docker иногда подставляют переменные).
 */
export function tryDecodeAdminAccountsBase64(b64: string | undefined): string | undefined {
  const t = b64?.trim();
  if (!t) return undefined;
  try {
    const decoded = Buffer.from(t, "base64").toString("utf8").trim();
    return decoded.length > 0 ? decoded : undefined;
  } catch {
    console.warn("[env] ADMIN_ACCOUNTS_BASE64 decode failed, ignoring");
    return undefined;
  }
}

/**
 * Дополнительные админы из `ADMIN_ACCOUNTS` (JSON-массив объектов `{ "login", "password" }`).
 * Основная пара `ADMIN_LOGIN` / `ADMIN_PASSWORD` всегда первая и не перезаписывается.
 */
export function parseExtraAdminAccountsJson(raw: string | undefined): AdminAccount[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AdminAccount[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const login = typeof rec.login === "string" ? rec.login.trim() : "";
      const password = typeof rec.password === "string" ? rec.password.trim() : "";
      if (login.length > 0 && password.length > 0 && login.length <= 80 && password.length <= 500) {
        out.push({ login, password });
      }
    }
    return out;
  } catch {
    console.warn("[env] ADMIN_ACCOUNTS is not valid JSON, ignoring");
    return [];
  }
}

export function mergeAdminAccounts(primary: AdminAccount, extras: AdminAccount[]): AdminAccount[] {
  const primaryKey = primary.login.toLowerCase();
  const merged: AdminAccount[] = [primary];
  for (const acc of extras) {
    if (acc.login.toLowerCase() === primaryKey) continue;
    if (merged.some((m) => m.login.toLowerCase() === acc.login.toLowerCase())) continue;
    merged.push(acc);
  }
  return merged;
}

export function adminCredentialMatch(
  accounts: readonly AdminAccount[],
  login: string,
  password: string,
): boolean {
  const loginNorm = login.trim();
  const passwordNorm = password.trim();
  return accounts.some((a) => a.login === loginNorm && a.password === passwordNorm);
}

/**
 * Второй админ без JSON: логин в plain, пароль лучше в base64 (`ADMIN_SECOND_PASSWORD_B64`),
 * чтобы символы `$`, `!` и т.д. не ломались в systemd / docker.
 */
export function parseOptionalSecondAdminFromEnv(env: NodeJS.ProcessEnv): AdminAccount | null {
  const login = env.ADMIN_SECOND_LOGIN?.trim();
  if (!login) return null;
  const b64 = env.ADMIN_SECOND_PASSWORD_B64?.trim();
  const plain = env.ADMIN_SECOND_PASSWORD?.trim();
  if (b64) {
    try {
      const password = Buffer.from(b64, "base64").toString("utf8").trim();
      if (!password) {
        console.warn(
          "[env] ADMIN_SECOND_PASSWORD_B64 decoded to empty password, ignoring second admin",
        );
        return null;
      }
      return { login, password };
    } catch {
      console.warn("[env] ADMIN_SECOND_PASSWORD_B64 is not valid base64, ignoring second admin");
      return null;
    }
  }
  if (plain) {
    return { login, password: plain };
  }
  console.warn(
    "[env] ADMIN_SECOND_LOGIN is set but neither ADMIN_SECOND_PASSWORD_B64 nor ADMIN_SECOND_PASSWORD — ignoring second admin",
  );
  return null;
}
