/** Playwright подключается динамически только для PDF-отчёта; на VPS может не быть установлен. */
declare module "playwright" {
  export const chromium: {
    executablePath: () => string;
    launch: (options?: Record<string, unknown>) => Promise<{
      newPage: (options?: Record<string, unknown>) => Promise<{
        emulateMedia: (options: Record<string, unknown>) => Promise<void>;
        goto: (url: string, options?: Record<string, unknown>) => Promise<void>;
        setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
        waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<void>;
        waitForTimeout: (timeoutMs: number) => Promise<void>;
        evaluate: <T>(pageFunction: () => T | Promise<T>) => Promise<T>;
        pdf: (options?: Record<string, unknown>) => Promise<Uint8Array>;
      }>;
      close: () => Promise<void>;
    }>;
  };
}
