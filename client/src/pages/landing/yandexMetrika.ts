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

let metrikaStarted = false;

export function hasLandingCookieConsent(): boolean {
  try {
    return window.localStorage.getItem(LANDING_COOKIE_CONSENT_KEY) === "1";
  } catch {
    return false;
  }
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
