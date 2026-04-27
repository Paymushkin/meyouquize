import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma.js";

type MigrationRow = {
  migration_name: string;
};

export async function ensureMigrationsAppliedOrThrow() {
  const currentFile = fileURLToPath(import.meta.url);
  const serverSrcDir = path.dirname(currentFile);
  const migrationsDir = path.resolve(serverSrcDir, "../prisma/migrations");
  const localMigrationNames = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const appliedRows = await prisma.$queryRawUnsafe<MigrationRow[]>(
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name ASC",
  );
  const appliedSet = new Set(appliedRows.map((row) => row.migration_name));
  const missing = localMigrationNames.filter((name) => !appliedSet.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Database migrations are not fully applied. Missing: ${missing.join(", ")}. Run prisma migrate deploy before starting the server.`,
    );
  }
}
