import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LANDING_COOKIE_CONSENT_KEY, LANDING_YANDEX_METRIKA_ID } from "./landingConstants";

type YmFn = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

declare global {
  interface Window {
    ym?: YmFn;
  }
}

/** JS-события целей (создать в Метрике как «JavaScript-событие» → совпадает). */
export const YM_GOAL = {
  contactOpen: "contact_open",
  demoClick: "demo_click",
} as const;

let metrikaStarted = false;

export function hasLandingCookieConsent(): boolean {
  try {
    return window.localStorage.getItem(LANDING_COOKIE_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

function ymCall(...args: unknown[]): void {
  if (typeof window === "undefined" || !window.ym) return;
  window.ym(...args);
}

/** Яндекс.Метрика только после согласия на cookies. */
export function startYandexMetrika(): void {
  if (typeof window === "undefined" || metrikaStarted) return;
  metrikaStarted = true;

  const id = LANDING_YANDEX_METRIKA_ID;
  const src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;

  const ymStub: YmFn = function (...args: unknown[]) {
    (ymStub.a = ymStub.a || []).push(args);
  };
  window.ym = window.ym || ymStub;
  window.ym.l = Date.now();

  const existing = Array.from(document.scripts).some((script) => script.src === src);
  if (!existing) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(script, first);
  }

  window.ym(id, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

export function startYandexMetrikaIfConsented(): void {
  if (hasLandingCookieConsent()) startYandexMetrika();
}

/** Просмотр страницы SPA (React Router). */
export function trackYandexMetrikaHit(url?: string, title?: string): void {
  if (!hasLandingCookieConsent() || !metrikaStarted) return;
  const href = url ?? `${location.pathname}${location.search}${location.hash}`;
  ymCall(LANDING_YANDEX_METRIKA_ID, "hit", href, {
    title: title ?? document.title,
    referer: document.referrer,
  });
}

/** Достижение JS-цели. */
export function reachYandexMetrikaGoal(goalId: string): void {
  if (!hasLandingCookieConsent()) return;
  if (!metrikaStarted) startYandexMetrika();
  ymCall(LANDING_YANDEX_METRIKA_ID, "reachGoal", goalId);
}

/** Хиты при смене маршрута на brand/landing страницах. */
export function useYandexMetrikaSpaHits(): void {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    startYandexMetrikaIfConsented();
    if (!hasLandingCookieConsent()) return;
    // Первый просмотр уже уходит в init; дальше — hit на навигацию
    if (first.current) {
      first.current = false;
      return;
    }
    trackYandexMetrikaHit(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);
}
