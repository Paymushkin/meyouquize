import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import WheelGestures, { type WheelEventState } from "wheel-gestures";

/** После последней сцены: один тик колеса поглощается без смены кадра, дальше скролл уходит на страницу */
export const DEMO_END_WHEEL_SLACK = 1;

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

    const wheelGestures = WheelGestures({
      /** Сами решаем, когда глушить скролл страницы (как в прежней логике на window). */
      preventWheelAction: false,
      /** Иначе по умолчанию библиотека инвертирует X/Y — направление сцен не совпадает с привычным скроллом. */
      reverseSign: false,
    });

    const onWheel = (state: WheelEventState) => {
      if (demoTabRef.current !== activeDemoTabIndex) {
        return;
      }

      if (!isDemoSectionInViewport(section)) {
        return;
      }

      const dy = state.axisDelta[1];
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

      const ev = state.event;
      if (typeof ev.preventDefault === "function") {
        ev.preventDefault();
      }

      /** Один шаг на пользовательский жест: первое событие серии, без фазы инерции тачпада. */
      if (state.isStart && !state.isMomentum) {
        applyWheelStep(tentativeDir);
      }
    };

    const offWheel = wheelGestures.on("wheel", onWheel);
    const unobserveWindow = wheelGestures.observe(window);

    return () => {
      offWheel();
      unobserveWindow();
      wheelGestures.disconnect();
    };
  }, [sectionRef, demoTabRef, activeDemoTabIndex, maxSceneIndex]);

  return { sceneIndex, setSceneIndex, sceneProgress, sceneCount };
}
