import { describe, expect, it } from "vitest";
import { speakerTargetLabel } from "./speakerTargetLabel.js";

describe("speakerTargetLabel", () => {
  it("formats all-speakers label", () => {
    expect(speakerTargetLabel("Все спикеры")).toBe("кому: всем спикерам");
  });

  it("formats specific speaker", () => {
    expect(speakerTargetLabel("Иван")).toBe("кому: Иван");
  });
});
