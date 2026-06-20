import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOTE_OPTION_BORDER_COLOR,
  isValidVoteOptionBorderColor,
  sanitizeVoteOptionBorderColor,
  voteOptionBorderColorToPickerHex,
} from "./voteOptionBorderColor.js";

describe("voteOptionBorderColor", () => {
  it("validates hex and rgba", () => {
    expect(isValidVoteOptionBorderColor("#aabbcc")).toBe(true);
    expect(isValidVoteOptionBorderColor("rgba(255,255,255,0.4)")).toBe(true);
    expect(isValidVoteOptionBorderColor("white")).toBe(false);
  });

  it("sanitizes invalid values", () => {
    expect(sanitizeVoteOptionBorderColor("oops", DEFAULT_VOTE_OPTION_BORDER_COLOR)).toBe(
      DEFAULT_VOTE_OPTION_BORDER_COLOR,
    );
  });

  it("converts rgba to picker hex", () => {
    expect(voteOptionBorderColorToPickerHex("rgba(255, 0, 0, 0.5)")).toBe("#ff0000");
    expect(voteOptionBorderColorToPickerHex("#123456")).toBe("#123456");
  });
});
