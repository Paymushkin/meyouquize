import { describe, expect, it } from "vitest";
import {
  buildPlayerJoinUrl,
  buildProjectorScreenUrl,
  buildSpeakerModeratorUrl,
  resolvePlayerFacingOrigin,
} from "./publicAppOrigin";

/** Пустые строки отключают import.meta.env.* из .env.local. */
const noEnvOverride = { vitePublicPlayerOrigin: "", lanHost: "" } as const;

describe("resolvePlayerFacingOrigin", () => {
  it("prefers window origin when not on loopback", () => {
    expect(
      resolvePlayerFacingOrigin({
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154:5173",
        lanHost: "192.168.1.23",
      }),
    ).toBe("http://192.168.0.154:5173");
  });

  it("rewrites localhost to LAN_HOST for phone QR", () => {
    expect(
      resolvePlayerFacingOrigin({
        vitePublicPlayerOrigin: "",
        windowOrigin: "http://localhost:5173",
        lanHost: "192.168.1.23",
      }),
    ).toBe("http://192.168.1.23:5173");
  });

  it("rewrites 127.0.0.1 keeping the vite port", () => {
    expect(
      resolvePlayerFacingOrigin({
        vitePublicPlayerOrigin: "",
        windowOrigin: "http://127.0.0.1:5174",
        lanHost: "192.168.1.23",
      }),
    ).toBe("http://192.168.1.23:5174");
  });

  it("uses VITE_PUBLIC_PLAYER_ORIGIN when admin is on localhost", () => {
    expect(
      resolvePlayerFacingOrigin({
        windowOrigin: "http://localhost:5173",
        vitePublicPlayerOrigin: "http://192.168.0.154:5173",
        lanHost: "10.0.0.1",
      }),
    ).toBe("http://192.168.0.154:5173");
  });

  it("ignores override when window is already on LAN", () => {
    expect(
      resolvePlayerFacingOrigin({
        windowOrigin: "http://192.168.1.23:5173",
        vitePublicPlayerOrigin: "http://192.168.0.154:5173",
        lanHost: "192.168.0.154",
      }),
    ).toBe("http://192.168.1.23:5173");
  });

  it("returns empty without window or override", () => {
    expect(resolvePlayerFacingOrigin(noEnvOverride)).toBe("");
  });
});

describe("buildPlayerJoinUrl", () => {
  it("builds join path on LAN when admin is on localhost", () => {
    expect(
      buildPlayerJoinUrl("demo", {
        vitePublicPlayerOrigin: "",
        windowOrigin: "http://localhost:5173",
        lanHost: "192.168.1.23",
      }),
    ).toBe("http://192.168.1.23:5173/q/demo");
  });
});

describe("buildProjectorScreenUrl", () => {
  it("builds projector path", () => {
    expect(
      buildProjectorScreenUrl("demo", {
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154:5173",
      }),
    ).toBe("http://192.168.0.154:5173/p/demo");
  });
});

describe("buildSpeakerModeratorUrl", () => {
  it("builds moderator path", () => {
    expect(
      buildSpeakerModeratorUrl("demo", {
        ...noEnvOverride,
        windowOrigin: "http://192.168.0.154:5173",
      }),
    ).toBe("http://192.168.0.154:5173/s/demo");
  });
});
