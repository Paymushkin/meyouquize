export type FormattedLogError = {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
};

/** Безопасный снимок ошибки для journal — без сырых объектов Prisma/Redis и вложенных секретов. */
export function formatErrorForLog(error: unknown): FormattedLogError {
  if (error instanceof Error) {
    const code = "code" in error ? String((error as NodeJS.ErrnoException).code ?? "") : "";
    return {
      message: error.message,
      name: error.name,
      ...(code ? { code } : {}),
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  return { message: String(error) };
}

export function formatRejectionForLog(reason: unknown): Record<string, unknown> {
  if (reason instanceof Error) {
    return { kind: "Error", ...formatErrorForLog(reason) };
  }
  if (typeof reason === "string") {
    return { kind: "string", message: reason };
  }
  return { kind: typeof reason, message: String(reason) };
}

export function logError(scope: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(scope, { ...extra, ...formatErrorForLog(error) });
}

export function logWarn(scope: string, details: Record<string, unknown>): void {
  console.warn(scope, details);
}
