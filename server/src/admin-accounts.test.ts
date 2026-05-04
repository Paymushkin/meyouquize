import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  adminCredentialMatch,
  mergeAdminAccounts,
  parseExtraAdminAccountsJson,
  tryDecodeAdminAccountsBase64,
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

  it("decodes ADMIN_ACCOUNTS_BASE64 payload (special chars survive)", () => {
    const json = JSON.stringify([{ login: "Anna", password: "x%$!y" }]);
    const b64 = Buffer.from(json, "utf8").toString("base64");
    expect(tryDecodeAdminAccountsBase64(b64)).toBe(json);
  });

  it("matches credentials", () => {
    const accounts = [
      { login: "admin", password: "p1" },
      { login: "Anna", password: "p2" },
    ];
    expect(adminCredentialMatch(accounts, "Anna", "p2")).toBe(true);
    expect(adminCredentialMatch(accounts, "  Anna  ", "  p2  ")).toBe(true);
    expect(adminCredentialMatch(accounts, "Anna", "wrong")).toBe(false);
  });
});
