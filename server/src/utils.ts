import crypto from "node:crypto";

export function randomSlug(): string {
  return crypto.randomBytes(4).toString("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(12).toString("hex");
}

export function randomNickname(): string {
  const adjectives = ["Swift", "Sunny", "Brave", "Lucky", "Calm", "Smart"];
  const animals = ["Fox", "Owl", "Wolf", "Hawk", "Panda", "Otter"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adjective}${animal}${num}`;
}

export function parseSelectedIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
