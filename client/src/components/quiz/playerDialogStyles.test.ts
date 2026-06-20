import { describe, expect, it } from "vitest";
import { buildPlayerDialogTabsSx } from "./playerDialogStyles";

describe("buildPlayerDialogTabsSx", () => {
  it("uses brand color for selected tab and indicator", () => {
    const sx = buildPlayerDialogTabsSx("#F3F722");
    expect(sx).toMatchObject({
      minHeight: 36,
      "& .MuiTabs-indicator": {
        backgroundColor: "#F3F722",
        height: 2,
      },
      "& .MuiTab-root": {
        textTransform: "none",
        "&.Mui-selected": {
          color: "#F3F722",
          fontWeight: 600,
        },
      },
    });
  });
});
