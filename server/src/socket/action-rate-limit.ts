type Bucket = { windowStart: number; count: number };

// Структура по socketId, чтобы cleanup на `disconnect` был O(1) и не сканировал весь Map.
const bucketsBySocket = new Map<string, Map<string, Bucket>>();

function getActionBuckets(socketId: string): Map<string, Bucket> {
  const existing = bucketsBySocket.get(socketId);
  if (existing) return existing;
  const created = new Map<string, Bucket>();
  bucketsBySocket.set(socketId, created);
  return created;
}

export function allowSocketAction(options: {
  socketId: string;
  action: string;
  windowMs: number;
  maxPerWindow: number;
}): boolean {
  const { socketId, action, windowMs, maxPerWindow } = options;
  const now = Date.now();
  const actionBuckets = getActionBuckets(socketId);
  let b = actionBuckets.get(action);
  if (!b || now - b.windowStart >= windowMs) {
    b = { windowStart: now, count: 0 };
    actionBuckets.set(action, b);
  }
  if (b.count >= maxPerWindow) return false;
  b.count += 1;
  return true;
}

export function clearSocketActionRateLimits(socketId: string): void {
  bucketsBySocket.delete(socketId);
}
