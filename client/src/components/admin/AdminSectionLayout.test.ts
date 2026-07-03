import { describe, expect, it } from "vitest";
import { adminSectionRootSx } from "./AdminSectionLayout";

describe("adminSectionRootSx", () => {
  it("styles admin links as white", () => {
    expect(adminSectionRootSx).toMatchObject({
      minHeight: "100vh",
      "& a, & .MuiLink-root": {
        color: "#ffffff",
        "&:visited": {
          color: "#ffffff",
        },
      },
    });
  });
});
