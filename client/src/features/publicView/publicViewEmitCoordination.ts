/** Координация admin:results:view:set — debounce, dedupe, подавление echo с сервера. */

const DEDUPE_MS = 300;
const SERVER_ECHO_MS = 2500;
const RAPID_BURST_MS = 280;
const DEBOUNCE_MS = 120;

const PROJECTOR_DEDUPE_KEYS = [
  "mode",
  "questionId",
  "questionRevealStage",
  "showFirstCorrectAnswerer",
  "showVoteCount",
  "showQuestionTitle",
  "leaderboardSubQuizId",
  "highlightedLeadersCount",
] as const;

export function publicViewPayloadKey(payload: Record<string, unknown>): string {
  const subset: Record<string, unknown> = {};
  for (const key of PROJECTOR_DEDUPE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      subset[key] = payload[key];
    }
  }
  return JSON.stringify(subset);
}

let lastEmittedKey = "";
let lastEmittedAt = 0;
let serverViewKey = "";
let serverViewRecordedAt = 0;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingEmit: (() => void) | null = null;
let pendingKey = "";

export function recordServerPublicView(payload: Record<string, unknown>) {
  serverViewKey = publicViewPayloadKey(payload);
  serverViewRecordedAt = Date.now();
}

export function resetPublicViewEmitCoordinationForTests() {
  lastEmittedKey = "";
  lastEmittedAt = 0;
  serverViewKey = "";
  serverViewRecordedAt = 0;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingEmit = null;
  pendingKey = "";
}

function shouldSkipEmit(payloadKey: string, now: number): boolean {
  if (payloadKey === serverViewKey && now - serverViewRecordedAt < SERVER_ECHO_MS) {
    return true;
  }
  if (payloadKey === lastEmittedKey && now - lastEmittedAt < DEDUPE_MS) {
    return true;
  }
  return false;
}

function runEmit(emitFn: () => void, payloadKey: string) {
  const now = Date.now();
  if (shouldSkipEmit(payloadKey, now)) return;
  lastEmittedKey = payloadKey;
  lastEmittedAt = now;
  emitFn();
}

/** Планирует emit: мгновенно при редких кликах, debounce при шторме. */
export function schedulePublicViewSocketEmit(emitFn: () => void, payloadKey: string) {
  const now = Date.now();
  if (shouldSkipEmit(payloadKey, now)) return;

  const rapidBurst = now - lastEmittedAt < RAPID_BURST_MS;

  if (!rapidBurst) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingEmit = null;
    runEmit(emitFn, payloadKey);
    return;
  }

  pendingEmit = emitFn;
  pendingKey = payloadKey;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const fn = pendingEmit;
    const key = pendingKey;
    pendingEmit = null;
    if (fn) runEmit(fn, key);
  }, DEBOUNCE_MS);
}

export function flushPublicViewSocketEmitForTests() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  const fn = pendingEmit;
  const key = pendingKey;
  pendingEmit = null;
  if (fn) runEmit(fn, key);
}
