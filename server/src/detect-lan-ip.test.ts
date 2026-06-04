import { describe, expect, it } from "vitest";
import {
  buildAutoLanClientOrigins,
  detectLanIPv4,
  isPrivateLanIPv4Address,
} from "./detect-lan-ip.js";

describe("isPrivateLanIPv4Address", () => {
  it("recognizes RFC1918 ranges", () => {
    expect(isPrivateLanIPv4Address("10.0.0.1")).toBe(true);
    expect(isPrivateLanIPv4Address("172.16.0.1")).toBe(true);
    expect(isPrivateLanIPv4Address("192.168.0.232")).toBe(true);
    expect(isPrivateLanIPv4Address("8.8.8.8")).toBe(false);
    expect(isPrivateLanIPv4Address("localhost")).toBe(false);
  });
});

describe("detectLanIPv4", () => {
  it("prefers en0 when it has a private address", () => {
    const ip = detectLanIPv4({
      en0: [{ family: "IPv4", address: "192.168.0.5", internal: false, netmask: "", mac: "" }],
      en1: [{ family: "IPv4", address: "10.0.0.2", internal: false, netmask: "", mac: "" }],
    });
    expect(ip).toBe("192.168.0.5");
  });

  it("falls back to any interface", () => {
    const ip = detectLanIPv4({
      utun0: [{ family: "IPv4", address: "10.1.2.3", internal: false, netmask: "", mac: "" }],
    });
    expect(ip).toBe("10.1.2.3");
  });
});

describe("buildAutoLanClientOrigins", () => {
  it("includes event and dev ports", () => {
    expect(buildAutoLanClientOrigins("192.168.0.1")).toEqual([
      "http://192.168.0.1",
      "http://192.168.0.1:5173",
      "http://localhost:5173",
    ]);
  });
});
