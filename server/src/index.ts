import { buildServer } from "./app.js";
import { env } from "./env.js";
import { ensureMigrationsAppliedOrThrow, resetProjectorViewOnStartup } from "./startup-checks.js";
import { ensureDemoQuizExists } from "./demo-seed.js";

await ensureMigrationsAppliedOrThrow();
await resetProjectorViewOnStartup();
await ensureDemoQuizExists();
const { httpServer, io } = await buildServer();

const server = httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${env.port}`);
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
