import { Buffer } from "node:buffer";

export type AdminAccount = { login: string; password: string };

function firstNonEmptyStringField(rec: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const s = String(v);
      if (s.length > 0) return s;
    }
  }
  return "";
}

/**
 * JSON из `ADMIN_ACCOUNTS_BASE64` (UTF-8) — предпочтительно в production: в значении нет `$`/`!`,
 * которые systemd / docker подменяют.
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
 * JSON-массив объектов `{ "login", "password" }` — все админы в одном месте.
 */
export function parseAdminAccountsJsonArray(raw: string | undefined): AdminAccount[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AdminAccount[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const login = firstNonEmptyStringField(rec, "login", "Login", "LOGIN");
      const password = firstNonEmptyStringField(rec, "password", "Password", "PASSWORD");
      if (login.length > 0 && password.length > 0 && login.length <= 80 && password.length <= 500) {
        out.push({ login, password });
      } else {
        console.warn(
          `[env] ADMIN_ACCOUNTS: element #${i + 1} skipped (need non-empty login and password as strings).`,
        );
      }
    }
    return out;
  } catch {
    console.warn("[env] ADMIN_ACCOUNTS is not valid JSON, ignoring");
    return [];
  }
}

/** Первое вхождение логина (без учёта регистра) сохраняется. */
export function dedupeAdminAccountsByLogin(accounts: AdminAccount[]): AdminAccount[] {
  const seen = new Set<string>();
  const out: AdminAccount[] = [];
  for (const acc of accounts) {
    const key = acc.login.toLowerCase();
    if (seen.has(key)) {
      console.warn(
        `[env] Duplicate admin login "${acc.login}" (case-insensitive match); keeping only the first entry's password.`,
      );
      continue;
    }
    seen.add(key);
    out.push(acc);
  }
  return out;
}

export function adminCredentialMatch(
  accounts: readonly AdminAccount[],
  login: string,
  password: string,
): boolean {
  const loginNorm = login.trim();
  const passwordNorm = password.trim();
  const loginKey = loginNorm.toLowerCase();
  return accounts.some((a) => {
    const storedPassword = a.password.trim();
    return a.login.trim().toLowerCase() === loginKey && storedPassword === passwordNorm;
  });
}
