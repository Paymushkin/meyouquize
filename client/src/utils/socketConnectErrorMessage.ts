/** Сообщение при connect_error — LAN и интернет-прод различаются. */
export function socketConnectErrorMessage(hostname: string = getHostname()): string {
  if (import.meta.env.DEV && isLocalDevHost(hostname)) {
    return "Нет соединения с сервером. Убедитесь, что backend запущен (порт 4000).";
  }
  if (isPrivateLanHost(hostname)) {
    return "Нет соединения с сервером квиза. Проверьте Wi‑Fi и что вы в сети площадки.";
  }
  return "Нет соединения с сервером. Проверьте интернет и обновите страницу.";
}

export function isSocketConnectionErrorMessage(message: string): boolean {
  return (
    message.includes("Нет соединения") ||
    message.includes("backend запущен") ||
    message.includes("сети площадки") ||
    message.includes("обновите страницу")
  );
}

function getHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}

function isLocalDevHost(hostname: string): boolean {
  return !hostname || hostname === "localhost" || /^127\./.test(hostname);
}

function isPrivateLanHost(hostname: string): boolean {
  if (!hostname) return false;
  if (isLocalDevHost(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}
