import { env } from "./env.js";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = env.databaseUrl;
}

export const prisma = new PrismaClient();
