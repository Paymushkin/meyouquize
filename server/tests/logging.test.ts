import { describe, expect, it } from "vitest";
import { formatErrorForLog, formatRejectionForLog } from "../src/logging.js";

describe("formatErrorForLog", () => {
  it("extracts message, name, code and stack from Error", () => {
    const err = new Error("boom") as NodeJS.ErrnoException;
    err.code = "ECONNREFUSED";
    const formatted = formatErrorForLog(err);
    expect(formatted.message).toBe("boom");
    expect(formatted.name).toBe("Error");
    expect(formatted.code).toBe("ECONNREFUSED");
    expect(formatted.stack).toContain("boom");
  });

  it("does not leak nested secrets from arbitrary objects", () => {
    const formatted = formatErrorForLog({
      password: "secret",
      databaseUrl: "postgresql://user:pass@host/db",
    });
    expect(formatted.message).toContain("object Object");
    expect(formatted).not.toHaveProperty("password");
  });
});

describe("formatRejectionForLog", () => {
  it("formats promise rejection reasons safely", () => {
    expect(formatRejectionForLog(new Error("fail"))).toMatchObject({
      kind: "Error",
      message: "fail",
    });
    expect(formatRejectionForLog("timeout")).toEqual({
      kind: "string",
      message: "timeout",
    });
  });
});
