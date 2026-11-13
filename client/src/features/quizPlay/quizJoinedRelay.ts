export type QuizJoinedPayload = { ok?: boolean; nickname?: string };

type SocketLike = {
  on: (event: string, handler: (payload?: QuizJoinedPayload) => void) => void;
};

let buffered: QuizJoinedPayload | null = null;
const subscribers = new Set<(payload: QuizJoinedPayload) => void>();
let armed = false;

/**
 * Ловит `quiz:joined` сразу на модуле сокета — до useEffect в React.
 * Иначе restore-join при reload успевает получить ack раньше подписки → вечный joinPending.
 */
export function armQuizJoinedRelay(socket: SocketLike): void {
  if (armed) return;
  armed = true;
  socket.on("quiz:joined", (payload?: QuizJoinedPayload) => {
    const next = payload ?? { ok: true };
    buffered = next;
    for (const subscriber of subscribers) {
      try {
        subscriber(next);
      } catch {
        /* ignore subscriber errors */
      }
    }
  });
}

export function subscribeQuizJoined(handler: (payload: QuizJoinedPayload) => void): () => void {
  subscribers.add(handler);
  if (buffered) {
    const snapshot = buffered;
    queueMicrotask(() => {
      if (subscribers.has(handler)) handler(snapshot);
    });
  }
  return () => {
    subscribers.delete(handler);
  };
}

export function clearQuizJoinedBuffer(): void {
  buffered = null;
}
