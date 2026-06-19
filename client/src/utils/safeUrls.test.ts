import { describe, expect, it } from "vitest";
import { sanitizeClientAssetUrl, sanitizeExternalHttpUrl } from "./safeUrls";

describe("sanitizeExternalHttpUrl", () => {
  it("accepts http(s) urls", () => {
    expect(sanitizeExternalHttpUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  it("rejects other schemes", () => {
    expect(sanitizeExternalHttpUrl("javascript:alert(1)")).toBe("");
  });
});

describe("sanitizeClientAssetUrl", () => {
  it("keeps relative paths", () => {
    expect(sanitizeClientAssetUrl("/media/logo.png")).toBe("/media/logo.png");
  });

  it("validates absolute urls", () => {
    expect(sanitizeClientAssetUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(sanitizeClientAssetUrl("data:text/plain,hi")).toBe("");
  });
});
