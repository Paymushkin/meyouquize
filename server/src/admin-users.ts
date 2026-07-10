import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma, type AdminUser } from "@prisma/client";
import { prisma } from "./prisma.js";

const SCRYPT_KEYLEN = 64;

export type PublicAdminUser = {
  id: string;
  login: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SuperAdminManagedAdminUser = {
  id: string;
  login: string;
  password: string;
  lastLoginAt: string | null;
};

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function parseHash(hash: string): { saltHex: string; digestHex: string } | null {
  const parts = hash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return null;
  const saltHex = parts[1]?.trim() ?? "";
  const digestHex = parts[2]?.trim() ?? "";
  if (!saltHex || !digestHex) return null;
  return { saltHex, digestHex };
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}

export function verifyAdminPassword(password: string, passwordHash: string): boolean {
  const parsed = parseHash(passwordHash);
  if (!parsed) return false;
  try {
    const expected = Buffer.from(parsed.digestHex, "hex");
    const salt = Buffer.from(parsed.saltHex, "hex");
    const got = scryptSync(password, salt, expected.length);
    if (expected.length !== got.length) return false;
    return timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

export function toPublicAdminUser(user: AdminUser): PublicAdminUser {
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toSuperAdminManagedAdminUser(user: AdminUser): SuperAdminManagedAdminUser {
  return {
    id: user.id,
    login: user.login,
    password: user.passwordPlain ?? "",
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function markAdminLastLogin(adminUserId: string): Promise<void> {
  try {
    await prisma.adminUser.update({
      where: { id: adminUserId },
      data: { lastLoginAt: new Date() },
    });
  } catch {
    // ignore — не блокируем вход
  }
}

async function findByLogin(login: string): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { loginKey: normalizeLogin(login) } });
}

function isMissingAdminUserTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    String(error.meta?.table).includes("AdminUser")
  );
}

export async function authenticateAdminUser(
  login: string,
  password: string,
): Promise<AdminUser | null> {
  let user: AdminUser | null = null;
  try {
    user = await findByLogin(login);
  } catch (error) {
    if (isMissingAdminUserTable(error)) return null;
    throw error;
  }
  if (!user || !user.isActive) return null;
  if (!verifyAdminPassword(password.trim(), user.passwordHash)) return null;
  return user;
}
