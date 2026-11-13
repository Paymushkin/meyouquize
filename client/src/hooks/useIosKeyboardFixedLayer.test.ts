// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIosKeyboardFixedLayer } from "./useIosKeyboardFixedLayer";

describe("useIosKeyboardFixedLayer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflowY = "";
    document.body.style.overscrollBehaviorY = "";
    document.documentElement.style.overflowY = "";
    document.documentElement.style.overscrollBehaviorY = "";
  });

  it("pins shell to visualViewport top/height (keyboard and idle)", () => {
    const layer = document.createElement("div");
    document.body.appendChild(layer);
    const ref = createRef<HTMLElement | null>();
    // @ts-expect-error test assign
    ref.current = layer;

    const listeners = new Map<string, Set<() => void>>();
    const vv = {
      offsetTop: 0,
      height: 800,
      addEventListener: (type: string, fn: () => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, fn: () => void) => {
        listeners.get(type)?.delete(fn);
      },
    };
    vi.stubGlobal("visualViewport", vv);
    vi.stubGlobal("innerHeight", 800);
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    const { unmount } = renderHook(() => useIosKeyboardFixedLayer(true, ref));

    expect(layer.style.top).toBe("0px");
    expect(layer.style.height).toBe("800px");
    expect(listeners.has("scroll")).toBe(true);

    // iOS keyboard: viewport shrinks and shifts down in layout coordinates.
    vv.offsetTop = 280;
    vv.height = 420;
    for (const fn of listeners.get("resize") ?? []) fn();
    expect(layer.style.top).toBe("280px");
    expect(layer.style.height).toBe("420px");

    unmount();
    expect(layer.style.height).toBe("");
    expect(document.body.style.overflowY).toBe("");
    layer.remove();
  });
});
