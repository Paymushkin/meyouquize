// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminEventNavSidebar } from "./AdminEventNavSidebar";

vi.mock("../../components/admin/AdminColorModeSwitcher", () => ({
  AdminColorModeSwitcher: () => null,
}));

describe("AdminEventNavSidebar", () => {
  it("shows unread dot on Q&A when sectionBadges.speakers is true", () => {
    const { container } = render(
      <AdminEventNavSidebar
        activeSection="questions"
        onSectionChange={() => {}}
        sectionBadges={{ speakers: true }}
      />,
    );
    expect(screen.getByRole("button", { name: "Q&A, есть новые" })).toBeTruthy();
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBeGreaterThan(0);
  });

  it("hides unread dot when badge is off", () => {
    render(
      <AdminEventNavSidebar
        activeSection="questions"
        onSectionChange={() => {}}
        sectionBadges={{ speakers: false }}
      />,
    );
    expect(screen.getByRole("button", { name: "Q&A" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Q&A, есть новые" })).toBeNull();
  });
});
