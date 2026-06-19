import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNickname, getOrCreateDeviceId, randomNickname, setNickname } from "./storage";

function createStorageMock() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

describe("storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
  });

  it("creates and reuses device id", () => {
    const first = getOrCreateDeviceId();
    expect(first.length).toBeGreaterThan(10);
    expect(getOrCreateDeviceId()).toBe(first);
  });

  it("stores nickname", () => {
    setNickname("Player");
    expect(getNickname()).toBe("Player");
  });

  it("generates random nickname from dictionary", () => {
    expect(randomNickname().length).toBeGreaterThan(3);
  });
});
