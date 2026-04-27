import { buildServer } from "./app.js";
import { env } from "./env.js";
import { ensureMigrationsAppliedOrThrow } from "./startup-checks.js";

await ensureMigrationsAppliedOrThrow();
const { httpServer } = await buildServer();

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${env.port}`);
});
