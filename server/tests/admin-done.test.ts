import { describe, expect, it } from "vitest";
import { patchQuestionAdminDoneSchema } from "../src/schemas.js";

describe("patchQuestionAdminDoneSchema", () => {
  it("accepts adminDone boolean", () => {
    expect(patchQuestionAdminDoneSchema.safeParse({ adminDone: true }).success).toBe(true);
    expect(patchQuestionAdminDoneSchema.safeParse({ adminDone: false }).success).toBe(true);
  });

  it("rejects empty payload", () => {
    expect(patchQuestionAdminDoneSchema.safeParse({}).success).toBe(false);
  });
});
