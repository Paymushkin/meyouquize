import { describe, expect, it } from "vitest";
import { speakerTargetLabel, speakerTargetLabelForAudience } from "./speakerTargetLabel.js";

describe("speakerTargetLabel", () => {
  it("formats all-speakers label", () => {
    expect(speakerTargetLabel("Все спикеры")).toBe("кому: всем спикерам");
  });

  it("formats specific speaker", () => {
    expect(speakerTargetLabel("Иван")).toBe("кому: Иван");
  });

  it("hides not-selected recipient for audience", () => {
    expect(speakerTargetLabelForAudience("не выбрано")).toBeNull();
    expect(speakerTargetLabelForAudience("Иван")).toBe("кому: Иван");
  });
});
