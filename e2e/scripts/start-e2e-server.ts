import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedE2eFixture } from "./seed-fixture.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function serverEnv(): NodeJS.ProcessEnv {
  const login = process.env.ADMIN_LOGIN?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD?.trim() || "test-admin-password";
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    TEST_DATABASE: "1",
    APP_NETWORK_MODE: "lan",
    LOCAL_ADMIN_NO_AUTH: "0",
    CLUSTER_WORKERS: "1",
    ADMIN_LOGIN: login,
    ADMIN_PASSWORD: password,
    ADMIN_ACCOUNTS: JSON.stringify([{ login, password }]),
  };
  delete env.ADMIN_ACCOUNTS_BASE64;
  return env;
}

async function main(): Promise<void> {
  const fixture = await seedE2eFixture();
  console.info(`[e2e] seeded room slug=${fixture.slug}`);

  const child = spawn("npm", ["run", "start:test", "-w", "server"], {
    cwd: repoRoot,
    env: serverEnv(),
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
