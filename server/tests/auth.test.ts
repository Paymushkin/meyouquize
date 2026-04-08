import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("admin auth", () => {
  it("rejects wrong credentials", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/auth")
      .send({ login: "bad", password: "bad" });
    expect(response.status).toBe(401);
  });
});
