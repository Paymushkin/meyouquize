import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { seedMinimalRoom } from "../helpers/testDb.js";

describe("integration infrastructure", () => {
  it("healthz responds", async () => {
    const app = buildApp();
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
  });

  it("readyz responds when database is available", async () => {
    const app = buildApp();
    const response = await request(app).get("/readyz");
    expect(response.status).toBe(200);
  });

  it("can seed and read a minimal room", async () => {
    const room = await seedMinimalRoom({ slug: "infra-smoke-room", title: "Infra Smoke" });
    expect(room.slug).toBe("infra-smoke-room");
    expect(room.title).toBe("Infra Smoke");
  });
});
