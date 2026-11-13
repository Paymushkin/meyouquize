/**
 * Prefixed Redis keys for experiment/networking-projector-timeline.
 * Rollback: SCAN+DEL these prefixes only (never FLUSHALL).
 * See deploy/scripts/rollback-experiment-networking-timeline.sh
 */

export const EXPERIMENT_TIMELINE_REDIS_PREFIX = "mq:timeline:";
export const EXPERIMENT_NETWORKING_REDIS_PREFIX = "mq:networking:";

export function timelineLockKey(quizId: string): string {
  return `${EXPERIMENT_TIMELINE_REDIS_PREFIX}${quizId}:lock`;
}

export function timelineOwnerKey(quizId: string): string {
  return `${EXPERIMENT_TIMELINE_REDIS_PREFIX}${quizId}:owner`;
}

export function networkingPresenceKey(quizId: string): string {
  return `${EXPERIMENT_NETWORKING_REDIS_PREFIX}${quizId}:presence`;
}

export function networkingPresenceMemberKey(quizId: string, participantId: string): string {
  return `${EXPERIMENT_NETWORKING_REDIS_PREFIX}${quizId}:presence:${participantId}`;
}
