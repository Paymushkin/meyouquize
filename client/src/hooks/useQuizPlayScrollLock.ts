import { useEffect } from "react";

type Params = {
  joined: boolean;
  hasPlayerOverlay: boolean;
};

export function useQuizPlayScrollLock({ joined, hasPlayerOverlay }: Params) {
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflowY;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
    const lockScroll = !joined || hasPlayerOverlay;
    const scrollY = window.scrollY;
    document.body.style.overflowY = lockScroll ? "hidden" : "auto";
    document.documentElement.style.overflowY = lockScroll ? "hidden" : "auto";
    document.body.style.overscrollBehaviorY = lockScroll ? "none" : "";
    document.documentElement.style.overscrollBehaviorY = lockScroll ? "none" : "";
    if (lockScroll) {
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflowY = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.documentElement.style.overscrollBehaviorY = prevHtmlOverscroll;
      if (lockScroll) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [joined, hasPlayerOverlay]);
}
