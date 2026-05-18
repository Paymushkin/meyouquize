import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";

/** После последней сцены: один тик колеса поглощается без смены кадра, дальше скролл уходит на страницу */
export const DEMO_END_WHEEL_SLACK = 1;

/** Пауза между сериями wheel — новый жест пользователя */
const WHEEL_GESTURE_BREAK_MS = 120;
/** События ближе этого интервала после первого считаем инерцией тачпада */
const WHEEL_MOMENTUM_MAX_MS = 40;

export type UseDemoScenarioWheelParams = {
  sectionRef: RefObject<HTMLElement | null>;
  demoTabRef: MutableRefObject<number>;
  /** Индекс вкладки демо, при которой этот сценарий обрабатывает колесо */
  activeDemoTabIndex: number;
  maxSceneIndex: number;
};

function isDemoSectionInViewport(section: HTMLElement) {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const edgeEps = 8;
  const intersectsViewport = rect.bottom > edgeEps && rect.top < vh - edgeEps;
  const enterFromBelow = rect.bottom >= vh - edgeEps;
  const enterFromTop = rect.top <= 120 && rect.bottom >= vh * 0.55;
  return intersectsViewport && (enterFromBelow || enterFromTop);
}

export function useDemoScenarioWheel(params: UseDemoScenarioWheelParams) {
  const { sectionRef, demoTabRef, activeDemoTabIndex, maxSceneIndex } = params;
  const [sceneIndex, setSceneIndex] = useState(0);
  const endWheelSlackUsed = useRef(0);
  const sceneIndexRef = useRef(sceneIndex);
  const maxSceneIndexRef = useRef(maxSceneIndex);

  const sceneCount = maxSceneIndex + 1;
  const sceneProgress = sceneCount > 1 ? sceneIndex / (sceneCount - 1) : 1;

  useLayoutEffect(() => {
    sceneIndexRef.current = sceneIndex;
    maxSceneIndexRef.current = maxSceneIndex;
    if (sceneIndex < maxSceneIndex) {
      endWheelSlackUsed.current = 0;
    }
  }, [sceneIndex, maxSceneIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const applyWheelStep = (dir: 1 | -1) => {
      if (dir > 0) {
        setSceneIndex((s) => {
          const maxI = maxSceneIndexRef.current;
          if (s < maxI) {
            return s + 1;
          }
          if (endWheelSlackUsed.current < DEMO_END_WHEEL_SLACK) {
            endWheelSlackUsed.current += 1;
          }
          return s;
        });
        return;
      }
      setSceneIndex((s) => (s > 0 ? s - 1 : s));
    };

    let lastWheelAt = 0;

    const onWheel = (ev: WheelEvent) => {
      if (demoTabRef.current !== activeDemoTabIndex) {
        return;
      }

      if (!isDemoSectionInViewport(section)) {
        return;
      }

      const dy = ev.deltaY;
      if (Math.abs(dy) < 1e-6) {
        return;
      }

      const tentativeDir = (dy > 0 ? 1 : -1) as 1 | -1;
      const idx = sceneIndexRef.current;
      const maxI = maxSceneIndexRef.current;

      if (tentativeDir > 0 && idx >= maxI && endWheelSlackUsed.current >= DEMO_END_WHEEL_SLACK) {
        return;
      }
      if (tentativeDir < 0 && idx <= 0) {
        return;
      }

      const now = performance.now();
      const gap = lastWheelAt === 0 ? Number.POSITIVE_INFINITY : now - lastWheelAt;
      lastWheelAt = now;
      const isStart = gap > WHEEL_GESTURE_BREAK_MS;
      const isMomentum = !isStart && gap < WHEEL_MOMENTUM_MAX_MS;

      ev.preventDefault();

      /** Один шаг на пользовательский жест: первое событие серии, без фазы инерции тачпада. */
      if (isStart && !isMomentum) {
        applyWheelStep(tentativeDir);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
    };
  }, [sectionRef, demoTabRef, activeDemoTabIndex, maxSceneIndex]);

  return { sceneIndex, setSceneIndex, sceneProgress, sceneCount };
}
