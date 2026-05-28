import { env } from "../env.js";

type TrialLogPayload = Record<string, unknown>;

function sanitizePayload(payload: TrialLogPayload): TrialLogPayload {
  const out: TrialLogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.length > 180) {
      out[key] = `${value.slice(0, 177)}...`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function trialLog(event: string, payload: TrialLogPayload): void {
  if (!env.trialLogsEnabled) return;
  console.info(
    JSON.stringify({
      scope: "trial",
      event,
      ts: new Date().toISOString(),
      ...sanitizePayload(payload),
    }),
  );
}
