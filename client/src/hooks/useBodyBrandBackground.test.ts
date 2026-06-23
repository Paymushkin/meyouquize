// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BODY_NO_DECOR_CLASS, useBodyBrandBackground } from "./useBodyBrandBackground";

describe("useBodyBrandBackground", () => {
  afterEach(() => {
    document.body.className = "";
    document.body.removeAttribute("style");
    const root = document.getElementById("root");
    if (root) root.removeAttribute("style");
  });

  it("adds mq-no-body-decor and sets background color", () => {
    renderHook(() =>
      useBodyBrandBackground({
        backgroundColor: "#112233",
        clearRootBackground: true,
        resetOverflowX: true,
      }),
    );

    expect(document.body.classList.contains(BODY_NO_DECOR_CLASS)).toBe(true);
    expect(document.body.style.backgroundColor).toBe("rgb(17, 34, 51)");
    expect(document.body.style.backgroundImage).toBe("none");
  });

  it("restores previous body styles on unmount", () => {
    document.body.style.backgroundColor = "rgb(1, 2, 3)";
    document.body.style.backgroundImage = "linear-gradient(red, blue)";

    const { unmount } = renderHook(() => useBodyBrandBackground({ backgroundColor: "#ffffff" }));

    expect(document.body.classList.contains(BODY_NO_DECOR_CLASS)).toBe(true);
    unmount();

    expect(document.body.classList.contains(BODY_NO_DECOR_CLASS)).toBe(false);
    expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)");
    expect(document.body.style.backgroundImage).toBe("linear-gradient(red, blue)");
  });
});
