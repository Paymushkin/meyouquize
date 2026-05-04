import cluster from "node:cluster";
import { buildServer } from "./app.js";
import { env } from "./env.js";
import { ensureMigrationsAppliedOrThrow, resetProjectorViewOnStartup } from "./startup-checks.js";
import { ensureDemoQuizExists } from "./demo-seed.js";

async function startListening() {
  const { httpServer, io } = await buildServer();
  const server = httpServer.listen(env.port, "0.0.0.0", () => {
    const role = cluster.isPrimary ? "primary" : "worker";
    console.log(`[server] listening http://0.0.0.0:${env.port} pid=${process.pid} (${role})`);
  });

  let shutdownInProgress = false;
  async function gracefulShutdown(signal: string) {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    console.info(`[server] received ${signal}, shutting down...`);
    io.close();
    server.close(() => {
      console.info("[server] HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[server] forced shutdown timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });
}

async function runSingleProcess() {
  await ensureMigrationsAppliedOrThrow();
  await resetProjectorViewOnStartup();
  await ensureDemoQuizExists();
  await startListening();
}

let primaryShutdownInProgress = false;
function shutdownClusterPrimary(signal: string) {
  if (primaryShutdownInProgress) return;
  primaryShutdownInProgress = true;
  console.info(`[cluster] primary received ${signal}, disconnecting workers...`);
  cluster.disconnect(() => {
    console.info("[cluster] workers stopped");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[cluster] primary forced exit");
    process.exit(1);
  }, 12_000).unref();
}

async function runClusterPrimary() {
  if (!env.redisUrl) {
    console.error(
      "[cluster] CLUSTER_WORKERS>1 requires REDIS_URL. Set CLUSTER_WORKERS=1 or add Redis.",
    );
    process.exit(1);
  }

  await ensureMigrationsAppliedOrThrow();
  await resetProjectorViewOnStartup();
  await ensureDemoQuizExists();

  const n = env.clusterWorkers;
  console.info(`[cluster] primary forking ${n} workers (shared port ${env.port}, Redis adapter)`);

  for (let i = 0; i < n; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    if (primaryShutdownInProgress) return;
    console.warn(
      `[cluster] worker pid=${worker.process.pid} exited code=${code} signal=${signal ?? ""} — restarting`,
    );
    cluster.fork();
  });

  process.on("SIGTERM", () => shutdownClusterPrimary("SIGTERM"));
  process.on("SIGINT", () => shutdownClusterPrimary("SIGINT"));
}

if (cluster.isPrimary) {
  if (env.clusterWorkers <= 1) {
    await runSingleProcess();
  } else {
    await runClusterPrimary();
  }
} else {
  await startListening();
}
