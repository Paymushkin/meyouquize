import { describe, expect, it } from "vitest";
import {
  clearEngineSessionId,
  isPrivateLanHostname,
  isSafariOrAppleMobileUa,
  shouldClearEngineSessionOnDisconnect,
  shouldPreferPollingOnly,
} from "./socketTransportPolicy";

const chromeUa =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const safariUa =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const iphoneUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("isPrivateLanHostname", () => {
  it("detects private ranges", () => {
    expect(isPrivateLanHostname("192.168.1.23")).toBe(true);
    expect(isPrivateLanHostname("10.0.0.1")).toBe(true);
    expect(isPrivateLanHostname("172.16.0.1")).toBe(true);
    expect(isPrivateLanHostname("172.31.255.1")).toBe(true);
  });

  it("rejects public and empty", () => {
    expect(isPrivateLanHostname("8.8.8.8")).toBe(false);
    expect(isPrivateLanHostname("172.32.0.1")).toBe(false);
    expect(isPrivateLanHostname("")).toBe(false);
  });
});

describe("isSafariOrAppleMobileUa", () => {
  it("detects Safari and iPhone, not Chrome", () => {
    expect(isSafariOrAppleMobileUa(safariUa)).toBe(true);
    expect(isSafariOrAppleMobileUa(iphoneUa)).toBe(true);
    expect(isSafariOrAppleMobileUa(chromeUa)).toBe(false);
  });
});

describe("shouldPreferPollingOnly", () => {
  const lanVite = {
    pageHostname: "192.168.1.23",
    pagePort: "5173",
    pageOrigin: "http://192.168.1.23:5173",
    socketUrl: "http://192.168.1.23:5173",
  };

  it("forces polling for Safari on LAN Vite", () => {
    expect(shouldPreferPollingOnly({ ...lanVite, userAgent: safariUa })).toBe(true);
    expect(shouldPreferPollingOnly({ ...lanVite, userAgent: iphoneUa })).toBe(true);
  });

  it("allows websocket upgrade for Chrome on LAN Vite", () => {
    expect(shouldPreferPollingOnly({ ...lanVite, userAgent: chromeUa })).toBe(false);
  });

  it("does not force polling for Safari on production host", () => {
    expect(
      shouldPreferPollingOnly({
        userAgent: safariUa,
        pageHostname: "ameyou.ru",
        pagePort: "",
        pageOrigin: "https://ameyou.ru",
        socketUrl: "https://ameyou.ru",
      }),
    ).toBe(false);
  });
});

describe("engine session clear", () => {
  it("clears sid only for transport/server disconnect reasons", () => {
    expect(shouldClearEngineSessionOnDisconnect("transport close")).toBe(true);
    expect(shouldClearEngineSessionOnDisconnect("io client disconnect")).toBe(false);
  });

  it("nulls engine id and query sid", () => {
    const engine = { id: "abc", transport: { query: { sid: "abc", EIO: "4" } } };
    clearEngineSessionId(engine);
    expect(engine.id).toBeNull();
    expect(engine.transport.query.sid).toBeUndefined();
    expect(engine.transport.query.EIO).toBe("4");
  });
});
