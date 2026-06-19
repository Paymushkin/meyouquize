import { describe, expect, it } from "vitest";
import { isPrivateNetworkViteDevPort } from "../src/cors-allow.js";

describe("isPrivateNetworkViteDevPort", () => {
  it("accepts localhost and loopback", () => {
    expect(isPrivateNetworkViteDevPort("http://localhost:5173")).toBe(true);
    expect(isPrivateNetworkViteDevPort("http://127.0.0.1:4000")).toBe(true);
  });

  it("accepts private IPv4 ranges", () => {
    expect(isPrivateNetworkViteDevPort("http://192.168.1.42:5173")).toBe(true);
    expect(isPrivateNetworkViteDevPort("http://10.0.0.5:3000")).toBe(true);
    expect(isPrivateNetworkViteDevPort("http://172.16.5.1:5173")).toBe(true);
  });

  it("rejects public hosts and invalid origins", () => {
    expect(isPrivateNetworkViteDevPort("https://example.com")).toBe(false);
    expect(isPrivateNetworkViteDevPort("ftp://192.168.1.1")).toBe(false);
    expect(isPrivateNetworkViteDevPort("not-a-url")).toBe(false);
  });
});
