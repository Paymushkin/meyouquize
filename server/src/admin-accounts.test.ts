import { describe, expect, it } from "vitest";
import {
  adminCredentialMatch,
  mergeAdminAccounts,
  parseExtraAdminAccountsJson,
} from "./admin-accounts.js";

describe("admin-accounts", () => {
  it("merges primary with extras, skips duplicate logins", () => {
    const merged = mergeAdminAccounts({ login: "admin", password: "a" }, [
      { login: "Anna", password: "b" },
      { login: "ADMIN", password: "ignored" },
      { login: "Bob", password: "c" },
    ]);
    expect(merged).toEqual([
      { login: "admin", password: "a" },
      { login: "Anna", password: "b" },
      { login: "Bob", password: "c" },
    ]);
  });

  it("parses valid JSON array", () => {
    const parsed = parseExtraAdminAccountsJson('[{"login":"Anna","password":"x"}]');
    expect(parsed).toEqual([{ login: "Anna", password: "x" }]);
  });

  it("matches credentials", () => {
    const accounts = [
      { login: "admin", password: "p1" },
      { login: "Anna", password: "p2" },
    ];
    expect(adminCredentialMatch(accounts, "Anna", "p2")).toBe(true);
    expect(adminCredentialMatch(accounts, "Anna", "wrong")).toBe(false);
  });
});
