import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandGeoPollSection } from "./BrandGeoPollSection";

const colorGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 1,
} as const;

function renderSection(overrides: Partial<Parameters<typeof BrandGeoPollSection>[0]> = {}) {
  const emitPatch = vi.fn();
  const setGeoPollScreenBackground = vi.fn();
  render(
    <BrandGeoPollSection
      colorGridSx={colorGridSx}
      geoPollMarkerColor="#F0B429"
      setGeoPollMarkerColor={vi.fn()}
      geoPollRegionFillIdle="#323232"
      setGeoPollRegionFillIdle={vi.fn()}
      geoPollRegionFillVoted="#5d5d5d"
      setGeoPollRegionFillVoted={vi.fn()}
      geoPollRegionStrokeIdle="#4a4a4a"
      setGeoPollRegionStrokeIdle={vi.fn()}
      geoPollRegionStrokeVoted="#ffffff"
      setGeoPollRegionStrokeVoted={vi.fn()}
      geoPollScreenBackground="#111111"
      setGeoPollScreenBackground={setGeoPollScreenBackground}
      emitPatch={emitPatch}
      {...overrides}
    />,
  );
  return { emitPatch, setGeoPollScreenBackground };
}

describe("BrandGeoPollSection", () => {
  it("shows screen background toggles and color fields", () => {
    renderSection();
    fireEvent.click(screen.getByText("Геоопрос"));
    expect(screen.getByText("Фон экрана")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Фон проектора" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Цвет" })).toBeTruthy();
    expect(screen.getByLabelText("Цвет фона")).toBeTruthy();
    expect(screen.getByLabelText("Цвет точки")).toBeTruthy();
  });

  it("emits transparent when switching to projector background", () => {
    const { emitPatch, setGeoPollScreenBackground } = renderSection();
    fireEvent.click(screen.getByText("Геоопрос"));
    fireEvent.click(screen.getByRole("button", { name: "Фон проектора" }));
    expect(setGeoPollScreenBackground).toHaveBeenCalledWith("transparent");
    expect(emitPatch).toHaveBeenCalledWith({ geoPollScreenBackground: "transparent" });
  });

  it("hides color picker in transparent mode", () => {
    renderSection({ geoPollScreenBackground: "transparent" });
    fireEvent.click(screen.getByText("Геоопрос"));
    expect(screen.queryByLabelText("Цвет фона")).toBeNull();
  });
});
