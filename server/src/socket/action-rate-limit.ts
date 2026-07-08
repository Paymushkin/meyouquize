type Bucket = { windowStart: number; count: number };

const buckets = new Map<string, Bucket>();

function key(socketId: string, action: string): string {
  return `${socketId}:${action}`;
}

export function allowSocketAction(options: {
  socketId: string;
  action: string;
  windowMs: number;
  maxPerWindow: number;
}): boolean {
  const { socketId, action, windowMs, maxPerWindow } = options;
  const now = Date.now();
  const k = key(socketId, action);
  let b = buckets.get(k);
  if (!b || now - b.windowStart >= windowMs) {
    b = { windowStart: now, count: 0 };
    buckets.set(k, b);
  }
  if (b.count >= maxPerWindow) return false;
  b.count += 1;
  return true;
}

export function clearSocketActionRateLimits(socketId: string): void {
  const prefix = `${socketId}:`;
  for (const k of buckets.keys()) {
    if (k.startsWith(prefix)) buckets.delete(k);
  }
}
