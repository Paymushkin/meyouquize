const MAX_CONCURRENT = 16;
let active = 0;
const waiters: Array<() => void> = [];

function acquire(): void {
  if (active >= MAX_CONCURRENT) return;
  const next = waiters.shift();
  if (!next) return;
  active += 1;
  next();
}

function release(): void {
  active = Math.max(0, active - 1);
  acquire();
}

/** Ограничивает параллельную догрузку join (scores/answers), чтобы не забить пул БД. */
export function scheduleJoinEnrichment(task: () => Promise<void>): void {
  waiters.push(() => {
    void task().finally(() => {
      release();
      acquire();
    });
  });
  acquire();
}
