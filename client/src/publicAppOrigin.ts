/** Убирает завершающий слэш у origin (http://host:port). */
export function stripTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, "");
}

type ResolveParams = {
  /** Текущий origin вкладки (в браузере). */
  windowOrigin?: string;
  /** Явный origin для QR/ссылок игроков (dev: админ на localhost, QR на LAN). */
  vitePublicPlayerOrigin?: string;
};

/**
 * Origin для ссылок и QR, по которым участники заходят в ивент.
 * В браузере — `window.location.origin` (тот же хост, что в адресной строке).
 * `VITE_PUBLIC_PLAYER_ORIGIN` — только если админ на localhost, а QR нужен на LAN (dev).
 *
 * Намеренно не используем `VITE_APP_ORIGIN`: он зашивается при `vite build` и даёт устаревший QR.
 */
export function resolvePlayerFacingOrigin(params: ResolveParams = {}): string {
  const override =
    params.vitePublicPlayerOrigin ??
    (import.meta.env.VITE_PUBLIC_PLAYER_ORIGIN as string | undefined);
  if (override?.trim()) {
    return stripTrailingSlash(override.trim());
  }

  const windowOrigin =
    params.windowOrigin ?? (typeof window !== "undefined" ? window.location.origin : undefined);
  if (windowOrigin) {
    return stripTrailingSlash(windowOrigin);
  }

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
