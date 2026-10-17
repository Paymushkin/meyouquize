import { describe, expect, it } from "vitest";
import {
  buildPlayerJoinUrl,
  buildProjectorScreenUrl,
  buildSpeakerModeratorUrl,
  resolvePlayerFacingOrigin,
} from "./publicAppOrigin";

/** Пустая строка отключает import.meta.env.VITE_PUBLIC_PLAYER_ORIGIN из .env.local. */
const noEnvOverride = { vitePublicPlayerOrigin: "" } as const;

describe("resolvePlayerFacingOrigin", () => {
  it("prefers window origin in browser context", () => {
    expect(
      resolvePlayerFacingOrigin({
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154",
      }),
    ).toBe("http://192.168.0.154");
  });

  it("uses VITE_PUBLIC_PLAYER_ORIGIN override when set", () => {
    expect(
      resolvePlayerFacingOrigin({
        windowOrigin: "http://localhost:5173",
        vitePublicPlayerOrigin: "http://192.168.0.154",
      }),
    ).toBe("http://192.168.0.154");
  });

  it("returns empty without window or override", () => {
    expect(resolvePlayerFacingOrigin(noEnvOverride)).toBe("");
  });
});

describe("buildPlayerJoinUrl", () => {
  it("builds join path", () => {
    expect(
      buildPlayerJoinUrl("demo", { ...noEnvOverride, windowOrigin: "http://192.168.0.154" }),
    ).toBe("http://192.168.0.154/q/demo");
  });
});

describe("buildProjectorScreenUrl", () => {
  it("builds projector path", () => {
    expect(
      buildProjectorScreenUrl("demo", {
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154",
      }),
    ).toBe("http://192.168.0.154/p/demo");
  });
});

describe("buildSpeakerModeratorUrl", () => {
  it("builds moderator path", () => {
    expect(
      buildSpeakerModeratorUrl("demo", {
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154",
      }),
    ).toBe("http://192.168.0.154/s/demo");
  });
});
