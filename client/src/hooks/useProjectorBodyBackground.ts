import { useBodyBrandBackground } from "./useBodyBrandBackground";

/** Синхронизирует фон `document.body` с цветом «Фон проектора», без декоративного паттерна админки. */
export function useProjectorBodyBackground(projectorBackground: string) {
  useBodyBrandBackground({
    backgroundColor: projectorBackground,
    clearRootBackground: true,
    resetOverflowX: true,
  });
}
