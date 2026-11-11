/** Минимальные версии под официальную поддержку MUI 7 (Safari/iOS ≥ 17). */
export const MIN_SUPPORTED_APPLE_MAJOR = 17;

function parseMajor(match: RegExpMatchArray | null): number | null {
  if (!match?.[1]) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

/** iPhone / iPod / iPad (мобильный UA). */
export function getIOSMajorVersion(userAgent: string): number | null {
  const ios = userAgent.match(/(?:iPhone|iPod|iPad).*?\bOS (\d+)[_\s]/i);
  if (ios) return parseMajor(ios);
  // Некоторые WebView: CPU iPhone OS 16_1_3
  const cpu = userAgent.match(/\bOS (\d+)[._]\d+/i);
  if (cpu && /iPhone|iPod|iPad|Mobile\/|like Mac OS X/i.test(userAgent)) {
    return parseMajor(cpu);
  }
  return null;
}

/** Десктопный Safari (не Chrome/Firefox/Edge на iOS/macOS). */
export function getDesktopSafariMajorVersion(userAgent: string): number | null {
  if (!/Safari\//i.test(userAgent)) return null;
  if (/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR\/|Firefox\//i.test(userAgent)) {
    return null;
  }
  return parseMajor(userAgent.match(/\bVersion\/(\d+)\./i));
}

export function isUnsupportedBrowser(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  const iosMajor = getIOSMajorVersion(userAgent);
  if (iosMajor != null && iosMajor < MIN_SUPPORTED_APPLE_MAJOR) return true;

  const safariMajor = getDesktopSafariMajorVersion(userAgent);
  if (safariMajor != null && safariMajor < MIN_SUPPORTED_APPLE_MAJOR) return true;

  return false;
}

export function renderUnsupportedBrowserMessage(root?: HTMLElement | null): void {
  const host =
    root ??
    (typeof document !== "undefined" ? document.getElementById("root") : null) ??
    (typeof document !== "undefined" ? document.body : null);
  if (!host) return;

  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.setAttribute("role", "alert");
  wrap.style.cssText = [
    "box-sizing:border-box",
    "min-height:100vh",
    "min-height:100dvh",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px 20px",
    "text-align:center",
    "background:#000",
    "color:#fff",
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = "max-width:22rem;width:100%";

  const title = document.createElement("h1");
  title.textContent = "Браузер не поддерживается";
  title.style.cssText =
    "margin:0 0 12px;font-size:1.35rem;line-height:1.25;font-weight:700;letter-spacing:-0.02em";

  const text = document.createElement("p");
  text.textContent =
    "Это устройство или версия Safari слишком старые для входа. Нужен iPhone или iPad с iOS 17 и новее — либо другой современный телефон.";
  text.style.cssText =
    "margin:0 0 10px;font-size:1rem;line-height:1.45;color:rgba(255,255,255,0.86)";

  const hint = document.createElement("p");
  hint.textContent = "Обновите iOS или откройте ссылку с другого устройства.";
  hint.style.cssText = "margin:0;font-size:0.92rem;line-height:1.4;color:rgba(255,255,255,0.62)";

  card.appendChild(title);
  card.appendChild(text);
  card.appendChild(hint);
  wrap.appendChild(card);
  host.appendChild(wrap);
}
