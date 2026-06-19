import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

if (!process.env.E2E_RUN_ID) {
  process.env.E2E_RUN_ID = `run-${Date.now()}`;
}

const e2eMediaDir = path.join(os.tmpdir(), `meyouquize-e2e-${process.env.E2E_RUN_ID}`, "media");

const testDatabaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/meyouquize_test";

const adminPassword = process.env.ADMIN_PASSWORD ?? "test-admin-password";

const testServerEnv: Record<string, string> = {
  NODE_ENV: "test",
  TEST_DATABASE: "1",
  APP_NETWORK_MODE: "lan",
  LOCAL_ADMIN_NO_AUTH: "0",
  CLUSTER_WORKERS: "1",
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: process.env.DIRECT_URL ?? testDatabaseUrl,
  ADMIN_LOGIN: process.env.ADMIN_LOGIN ?? "admin",
  ADMIN_PASSWORD: adminPassword,
  ADMIN_ACCOUNTS: JSON.stringify([
    { login: process.env.ADMIN_LOGIN ?? "admin", password: adminPassword },
  ]),
  CLIENT_ORIGIN: "http://127.0.0.1:5173",
  PORT: "4000",
  E2E_RUN_ID: process.env.E2E_RUN_ID,
  MEDIA_DIR: e2eMediaDir,
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.mjs",
  globalTeardown: "./e2e/global-teardown.mjs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npx tsx e2e/scripts/start-e2e-server.ts",
      url: "http://127.0.0.1:4000/healthz",
      reuseExistingServer: false,
      timeout: 120_000,
      env: testServerEnv,
    },
    {
      command: "npm run dev -w client -- --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_URL: "http://127.0.0.1:4000",
        VITE_SOCKET_URL: "http://127.0.0.1:4000",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI
          ? {}
          : { channel: (process.env.PLAYWRIGHT_CHANNEL ?? "chrome") as "chrome" }),
      },
    },
  ],
});
