import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import {
  adminCredentialMatch,
  dedupeAdminAccountsByLogin,
  parseAdminAccountsJsonArray,
  tryDecodeAdminAccountsBase64,
} from "./admin-accounts.js";

describe("admin-accounts", () => {
  it("dedupes by login (case-insensitive), first wins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const list = dedupeAdminAccountsByLogin([
      { login: "admin", password: "a" },
      { login: "Anna", password: "b" },
      { login: "ADMIN", password: "ignored" },
    ]);
    expect(list).toEqual([
      { login: "admin", password: "a" },
      { login: "Anna", password: "b" },
    ]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("parses valid JSON array", () => {
    const parsed = parseAdminAccountsJsonArray('[{"login":"Anna","password":"x"}]');
    expect(parsed).toEqual([{ login: "Anna", password: "x" }]);
  });

  it("decodes ADMIN_ACCOUNTS_BASE64 payload (special chars survive)", () => {
    const json = JSON.stringify([{ login: "Anna", password: "x%$!y" }]);
    const b64 = Buffer.from(json, "utf8").toString("base64");
    expect(tryDecodeAdminAccountsBase64(b64)).toBe(json);
  });

  it("matches credentials with trim", () => {
    const accounts = [
      { login: "admin", password: "p1" },
      { login: "Anna", password: "p2" },
    ];
    expect(adminCredentialMatch(accounts, "Anna", "p2")).toBe(true);
    expect(adminCredentialMatch(accounts, "  Anna  ", "  p2  ")).toBe(true);
    expect(adminCredentialMatch(accounts, "Anna", "wrong")).toBe(false);
  });

  it("matches login case-insensitively (password still exact)", () => {
    const accounts = [{ login: "admin", password: "p1" }];
    expect(adminCredentialMatch(accounts, "Admin", "p1")).toBe(true);
    expect(adminCredentialMatch(accounts, "ADMIN", "p1")).toBe(true);
    expect(adminCredentialMatch(accounts, "Admin", "P1")).toBe(false);
  });

  it("matches second account from a two-entry ADMIN_ACCOUNTS JSON line", () => {
    const raw =
      '[{"login":"admin","password":"admin_test_pass_001"},{"login":"Anna","password":"anna_test_pass_001"}]';
    const accounts = dedupeAdminAccountsByLogin(parseAdminAccountsJsonArray(raw));
    expect(accounts).toHaveLength(2);
    expect(adminCredentialMatch(accounts, "Anna", "anna_test_pass_001")).toBe(true);
    expect(adminCredentialMatch(accounts, "ANNA", "anna_test_pass_001")).toBe(true);
  });

  it("parses Login/Password key aliases", () => {
    const parsed = parseAdminAccountsJsonArray('[{"Login":"x","Password":"y"}]');
    expect(parsed).toEqual([{ login: "x", password: "y" }]);
  });
});
