import { useEffect, type RefObject } from "react";

/**
 * Фиксированный слой чата = ровно visualViewport.
 *
 * На iOS при клавиатуре layout viewport часто остаётся высоким, а видимая область
 * сдвигается (offsetTop > 0). Если оставить top:0 и height:vv.height, в кадре
 * оказывается низ оболочки (инпут «прыгает» наверх). Поэтому всегда:
 *   top = vv.offsetTop, height = vv.height
 * и глушим скролл документа (иначе Safari утаскивает focus в поле).
 */
export function useIosKeyboardFixedLayer(
  active: boolean,
  layerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const layer = layerRef.current;
    if (!layer || typeof window === "undefined") return;

    const locked: {
      el: HTMLElement;
      overflowY: string;
      overscrollBehaviorY: string;
    }[] = [];
    const lockScroll = (el: HTMLElement | null | undefined) => {
      if (!el) return;
      locked.push({
        el,
        overflowY: el.style.overflowY,
        overscrollBehaviorY: el.style.overscrollBehaviorY,
      });
      el.style.overflowY = "hidden";
      el.style.overscrollBehaviorY = "none";
    };

    lockScroll(document.documentElement);
    lockScroll(document.body);
    document.querySelectorAll(".MuiContainer-root").forEach((node) => {
      if (node instanceof HTMLElement) lockScroll(node);
    });

    const pinDocumentScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelectorAll(".MuiContainer-root").forEach((node) => {
        if (node instanceof HTMLElement) node.scrollTop = 0;
      });
    };

    const sync = () => {
      const vv = window.visualViewport;
      const top = vv ? Math.max(0, vv.offsetTop) : 0;
      const height = vv?.height ?? window.innerHeight;
      layer.style.top = `${top}px`;
      layer.style.height = `${Math.max(0, height)}px`;
      layer.style.minHeight = `${Math.max(0, height)}px`;
      layer.style.maxHeight = `${Math.max(0, height)}px`;
      layer.style.bottom = "auto";
      pinDocumentScroll();
    };

    sync();
    const vv = window.visualViewport;
    // scroll нужен: при фокусе iOS двигает visualViewport без resize.
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", pinDocumentScroll, { passive: true });

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", pinDocumentScroll);
      layer.style.top = "";
      layer.style.bottom = "";
      layer.style.height = "";
      layer.style.minHeight = "";
      layer.style.maxHeight = "";
      for (const { el, overflowY, overscrollBehaviorY } of locked) {
        el.style.overflowY = overflowY;
        el.style.overscrollBehaviorY = overscrollBehaviorY;
      }
    };
  }, [active, layerRef]);
}
