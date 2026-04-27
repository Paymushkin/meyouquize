type ApiErrorPayload = {
  error?: string | { code?: string; message?: string; details?: unknown };
  code?: string;
  message?: string;
  details?: unknown;
};

export function parseApiErrorMessage(payload: unknown, fallback = "Request failed"): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as ApiErrorPayload;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (
    data.error &&
    typeof data.error === "object" &&
    typeof data.error.message === "string" &&
    data.error.message.trim()
  ) {
    return data.error.message;
  }
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}
