/** Playwright подключается динамически только для PDF-отчёта; на VPS может не быть установлен. */
declare module "playwright" {
  export const chromium: {
    launch: (options?: Record<string, unknown>) => Promise<{
      newPage: (options?: Record<string, unknown>) => Promise<{
        emulateMedia: (options: Record<string, unknown>) => Promise<void>;
        goto: (url: string, options?: Record<string, unknown>) => Promise<void>;
        waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<void>;
        pdf: (options?: Record<string, unknown>) => Promise<Uint8Array>;
      }>;
      close: () => Promise<void>;
    }>;
  };
}
