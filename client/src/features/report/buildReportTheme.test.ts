import { describe, expect, it } from "vitest";
import { buildReportTheme } from "./buildReportTheme";

describe("buildReportTheme", () => {
  it("uses brand colors in palette", () => {
    const theme = buildReportTheme({
      brandPrimaryColor: "#ff00aa",
      brandAccentColor: "#00aaff",
      brandSurfaceColor: "#222222",
      brandTextColor: "#f5f5f5",
      brandFontFamily: "Roboto, sans-serif",
      brandBodyBackgroundColor: "#111111",
    });
    expect(theme.palette.primary.main).toBe("#ff00aa");
    expect(theme.palette.secondary.main).toBe("#00aaff");
    expect(theme.palette.background.default).toBe("#111111");
    expect(theme.palette.text.primary).toBe("#f5f5f5");
  });
});
