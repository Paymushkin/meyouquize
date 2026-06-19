/** Playwright global setup — seed выполняется в `e2e/scripts/start-e2e-server.ts` до старта API. */
export default async function globalSetup() {
  if (!process.env.E2E_RUN_ID) {
    process.env.E2E_RUN_ID = `run-${Date.now()}`;
  }
}
