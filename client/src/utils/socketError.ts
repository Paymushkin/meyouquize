export type SocketErrorEvent = {
  code?: string;
  message?: string;
  details?: unknown;
};

export function parseSocketErrorMessage(evt: unknown): string {
  if (typeof evt === "string") return evt;
  if (evt && typeof evt === "object" && "message" in evt) {
    const message = (evt as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Произошла ошибка соединения.";
}

export function parseSocketErrorCode(evt: unknown): string | null {
  if (evt && typeof evt === "object" && "code" in evt) {
    const code = (evt as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code;
  }
  return null;
}
