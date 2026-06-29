import { describe, expect, it } from "vitest";
import {
  isSocketConnectionErrorMessage,
  socketConnectErrorMessage,
} from "./socketConnectErrorMessage";

describe("socketConnectErrorMessage", () => {
  it("returns internet message for public hostnames", () => {
    expect(socketConnectErrorMessage("ameyou.ru")).toBe(
      "Нет соединения с сервером. Проверьте интернет и обновите страницу.",
    );
    expect(socketConnectErrorMessage("meyou.site")).toBe(
      "Нет соединения с сервером. Проверьте интернет и обновите страницу.",
    );
  });

  it("returns LAN message for private IPs", () => {
    expect(socketConnectErrorMessage("192.168.1.10")).toContain("Wi‑Fi");
    expect(socketConnectErrorMessage("10.0.0.5")).toContain("площадки");
  });

  it("returns dev backend hint for localhost in vite dev", () => {
    expect(socketConnectErrorMessage("localhost")).toContain("порт 4000");
  });

  it("detects connection error messages for clearing on reconnect", () => {
    const msg = socketConnectErrorMessage("ameyou.ru");
    expect(isSocketConnectionErrorMessage(msg)).toBe(true);
    expect(isSocketConnectionErrorMessage("Ник уже используется")).toBe(false);
  });
});
