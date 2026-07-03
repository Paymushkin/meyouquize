// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminEventBootstrap } from "./useAdminEventBootstrap";

function makeParams(overrides: Partial<Parameters<typeof useAdminEventBootstrap>[0]> = {}) {
  return {
    eventName: "demo",
    isAuth: false,
    checkSession: vi.fn(async () => false),
    loadRoom: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("useAdminEventBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls checkSession on mount even when isAuth is false", async () => {
    const params = makeParams({ isAuth: false });

    renderHook(() => useAdminEventBootstrap(params));

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).toHaveBeenCalledTimes(1);
    expect(params.loadRoom).not.toHaveBeenCalled();
  });

  it("loads room only after isAuth becomes true", async () => {
    const params = makeParams({ isAuth: false, checkSession: vi.fn(async () => true) });

    const { rerender } = renderHook(
      (auth: boolean) => useAdminEventBootstrap({ ...params, isAuth: auth }),
      { initialProps: false },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).toHaveBeenCalledTimes(1);
    expect(params.loadRoom).not.toHaveBeenCalled();

    rerender(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.loadRoom).toHaveBeenCalledTimes(1);
  });

  it("re-checks session when eventName changes", async () => {
    const params = makeParams();

    const { rerender } = renderHook(
      (eventName: string) => useAdminEventBootstrap({ ...params, eventName }),
      { initialProps: "demo" },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).toHaveBeenCalledTimes(1);

    rerender("other-room");

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).toHaveBeenCalledTimes(2);
    expect(params.loadRoom).not.toHaveBeenCalled();
  });

  it("does nothing when eventName is empty", async () => {
    const params = makeParams({ eventName: "", isAuth: true });

    renderHook(() => useAdminEventBootstrap(params));

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).not.toHaveBeenCalled();
    expect(params.loadRoom).not.toHaveBeenCalled();
  });

  it("does nothing for reserved global admin segments", async () => {
    const params = makeParams({ eventName: "fonts", isAuth: true });

    renderHook(() => useAdminEventBootstrap(params));

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.checkSession).not.toHaveBeenCalled();
    expect(params.loadRoom).not.toHaveBeenCalled();
  });
});
