const SUBMIT_WINDOW_MS = 60_000;
const SUBMIT_MAX_PER_WINDOW = 40;

type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

export function clearSubmitRateLimit(socketId: string) {
  buckets.delete(socketId);
}

export function allowAnswerSubmit(socketId: string): boolean {
  const now = Date.now();
  let b = buckets.get(socketId);
  if (!b || now - b.windowStart >= SUBMIT_WINDOW_MS) {
    b = { windowStart: now, count: 0 };
    buckets.set(socketId, b);
  }
  if (b.count >= SUBMIT_MAX_PER_WINDOW) return false;
  b.count += 1;
  return true;
}
