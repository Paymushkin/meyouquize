import { describe, expect, it } from "vitest";
import { buildAdminSectionRootSx } from "./AdminSectionLayout";

describe("buildAdminSectionRootSx", () => {
  it("styles admin links as white in dark mode", () => {
    expect(buildAdminSectionRootSx("dark")).toMatchObject({
      minHeight: "100vh",
      "& a, & .MuiLink-root": {
        color: "#ffffff",
        "&:visited": {
          color: "#ffffff",
        },
      },
    });
  });

  it("inherits link color in light mode", () => {
    expect(buildAdminSectionRootSx("light")).toMatchObject({
      minHeight: "100vh",
      "& a, & .MuiLink-root": {
        color: "inherit",
      },
    });
  });
});
