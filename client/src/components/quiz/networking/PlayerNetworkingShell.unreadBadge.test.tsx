import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerNetworkingShell } from "./PlayerNetworkingShell";

describe("PlayerNetworkingShell unread badge", () => {
  it("hides badge when unreadTotal is 0", () => {
    render(
      <PlayerNetworkingShell
        tab="guests"
        onTabChange={vi.fn()}
        unreadTotal={0}
        buttonBackgroundColor="#fff"
        buttonTextColor="#000"
      >
        <div />
      </PlayerNetworkingShell>,
    );
    expect(screen.getByRole("button", { name: "Чаты" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Чаты, .+ новых/ })).toBeNull();
  });

  it("shows unread count over Chats when unreadTotal > 0", () => {
    render(
      <PlayerNetworkingShell
        tab="guests"
        onTabChange={vi.fn()}
        unreadTotal={3}
        buttonBackgroundColor="#fff"
        buttonTextColor="#000"
      >
        <div />
      </PlayerNetworkingShell>,
    );
    expect(screen.getByRole("button", { name: "Чаты, 3 новых" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
