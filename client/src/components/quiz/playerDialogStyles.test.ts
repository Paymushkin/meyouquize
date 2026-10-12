import { describe, expect, it } from "vitest";
import {
  buildPlayerDialogSelectMenuProps,
  buildPlayerDialogTabsSx,
  buildPlayerDialogTextFieldSx,
} from "./playerDialogStyles";

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
        textAlign: "left",
        justifyContent: "flex-start",
        "&.Mui-selected": {
          color: "#F3F722",
          fontWeight: 600,
        },
      },
    });
  });
});

describe("buildPlayerDialogSelectMenuProps", () => {
  it("keeps menu portaled with touch-friendly modal props", () => {
    const menuProps = buildPlayerDialogSelectMenuProps(
      "Jost, Arial, sans-serif",
      "#F3F722",
      "#000000",
    );
    expect(menuProps.disablePortal).toBeUndefined();
    expect(menuProps.disableScrollLock).toBe(true);
    expect(menuProps.PaperProps?.className).toBe("notranslate");
    expect(menuProps.sx).toMatchObject({ zIndex: 1400 });
    expect(menuProps.slotProps?.root).toMatchObject({
      disableEnforceFocus: true,
      disableAutoFocus: true,
    });
  });

  it("uses brand color for menu item hover and selected states", () => {
    const menuProps = buildPlayerDialogSelectMenuProps(
      "Jost, Arial, sans-serif",
      "#F3F722",
      "#000000",
    );
    const paperSx = menuProps.PaperProps?.sx as Record<string, unknown>;
    expect(paperSx.maxWidth).toBe("min(576px, calc(100vw - 32px))");
    const menuItemSx = (paperSx["& .MuiMenuItem-root"] ?? {}) as Record<string, unknown>;
    expect(menuItemSx).toMatchObject({
      whiteSpace: "normal",
      wordBreak: "break-word",
      minHeight: 48,
      touchAction: "manipulation",
      "&:hover": {
        color: "#F3F722",
      },
      "&.Mui-selected": {
        bgcolor: "#F3F722",
        color: "#000000",
      },
    });
  });
});
