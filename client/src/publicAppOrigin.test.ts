import { describe, expect, it } from "vitest";
import {
  buildPlayerJoinUrl,
  buildProjectorScreenUrl,
  resolvePlayerFacingOrigin,
} from "./publicAppOrigin";

describe("resolvePlayerFacingOrigin", () => {
  it("prefers window origin in browser context", () => {
    expect(
      resolvePlayerFacingOrigin({
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
    expect(resolvePlayerFacingOrigin({})).toBe("");
  });
});

describe("buildPlayerJoinUrl", () => {
  it("builds join path", () => {
    expect(buildPlayerJoinUrl("demo", { windowOrigin: "http://192.168.0.154" })).toBe(
      "http://192.168.0.154/q/demo",
    );
  });
});

describe("buildProjectorScreenUrl", () => {
  it("builds projector path", () => {
    expect(buildProjectorScreenUrl("demo", { windowOrigin: "http://192.168.0.154" })).toBe(
      "http://192.168.0.154/p/demo",
    );
  });
});
