import { describe, expect, it } from "vitest";
import {
  getDesktopSafariMajorVersion,
  getIOSMajorVersion,
  isUnsupportedBrowser,
} from "./unsupportedBrowserGate";

describe("unsupportedBrowserGate", () => {
  it("detects iOS Safari 16.1 as unsupported", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1.3 Mobile/15E148 Safari/604.1";
    expect(getIOSMajorVersion(ua)).toBe(16);
    expect(isUnsupportedBrowser(ua)).toBe(true);
  });

  it("allows iOS 17+", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(getIOSMajorVersion(ua)).toBe(17);
    expect(isUnsupportedBrowser(ua)).toBe(false);
  });

  it("detects desktop Safari 16 as unsupported", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15";
    expect(getDesktopSafariMajorVersion(ua)).toBe(16);
    expect(isUnsupportedBrowser(ua)).toBe(true);
  });

  it("does not treat Chrome iOS as desktop Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(getDesktopSafariMajorVersion(ua)).toBeNull();
    expect(isUnsupportedBrowser(ua)).toBe(false);
  });

  it("blocks Chrome on iOS 16 via OS version", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.0.0 Mobile/15E148 Safari/604.1";
    expect(isUnsupportedBrowser(ua)).toBe(true);
  });
});
