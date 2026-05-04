export function sanitizeExternalHttpUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return raw;
  } catch {
    return "";
  }
  return "";
}

export function sanitizeClientAssetUrl(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  return sanitizeExternalHttpUrl(raw);
}
