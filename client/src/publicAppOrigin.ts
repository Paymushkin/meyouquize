/** Убирает завершающий слэш у origin (http://host:port). */
export function stripTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, "");
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

type ResolveParams = {
  /** Текущий origin вкладки (в браузере). */
  windowOrigin?: string;
  /** Явный origin для QR/ссылок игроков (dev: админ на localhost, QR на LAN). */
  vitePublicPlayerOrigin?: string;
  /** Хост Wi‑Fi (из `LAN_HOST` в корневом `.env`), без схемы. */
  lanHost?: string;
};

function resolveLanHost(params: ResolveParams): string {
  const fromParams = params.lanHost?.trim() ?? "";
  if (fromParams) return fromParams;
  const fromEnv = (import.meta.env.LAN_HOST as string | undefined)?.trim() ?? "";
  return fromEnv;
}

function resolveOriginOverride(params: ResolveParams): string {
  const fromParams = params.vitePublicPlayerOrigin;
  if (typeof fromParams === "string") return fromParams.trim();
  return ((import.meta.env.VITE_PUBLIC_PLAYER_ORIGIN as string | undefined) ?? "").trim();
}

/**
 * Origin для ссылок и QR, по которым участники заходят в ивент.
 * В браузере — `window.location.origin` (тот же хост, что в адресной строке).
 * Если админ открыл localhost, а в `.env` есть `LAN_HOST` / `VITE_PUBLIC_PLAYER_ORIGIN` —
 * QR и join-ссылки смотрят на LAN, чтобы телефон в Wi‑Fi мог подключиться.
 *
 * Намеренно не используем `VITE_APP_ORIGIN`: он зашивается при `vite build` и даёт устаревший QR.
 */
export function resolvePlayerFacingOrigin(params: ResolveParams = {}): string {
  const override = resolveOriginOverride(params);
  const lanHost = resolveLanHost(params);

  const windowOrigin =
    params.windowOrigin ?? (typeof window !== "undefined" ? window.location.origin : undefined);

  if (windowOrigin) {
    try {
      const url = new URL(windowOrigin);
      if (isLoopbackHostname(url.hostname)) {
        if (override) return stripTrailingSlash(override);
        if (lanHost) {
          url.hostname = lanHost;
          return stripTrailingSlash(url.origin);
        }
      }
    } catch {
      /* невалидный origin — ниже fallback */
    }
    return stripTrailingSlash(windowOrigin);
  }

  if (override) return stripTrailingSlash(override);
  if (lanHost) return stripTrailingSlash(`http://${lanHost}:5173`);
  return "";
}

/** Ссылка входа игрока в ивент. */
export function buildPlayerJoinUrl(slug: string, params?: ResolveParams): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  const origin = resolvePlayerFacingOrigin(params);
  return origin ? `${origin}/q/${trimmed}` : "";
}

/** Ссылка экрана проектора. */
export function buildProjectorScreenUrl(slug: string, params?: ResolveParams): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  const origin = resolvePlayerFacingOrigin(params);
  return origin ? `${origin}/p/${trimmed}` : "";
}

/** Публичная страница модератора вопросов спикерам (read-only). */
export function buildSpeakerModeratorUrl(slug: string, params?: ResolveParams): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  const origin = resolvePlayerFacingOrigin(params);
  return origin ? `${origin}/s/${trimmed}` : "";
}
