import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import {
  createAdminAgent,
  adminPassword,
  joinPlayer,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";
import { setQuestionEnabled } from "../../src/quiz-service.js";

function readSetCookieHeader(headers: request.Response["headers"]): string[] {
  const raw = headers["set-cookie"];
  if (Array.isArray(raw)) return raw;
  return raw ? [raw] : [];
}

describe("HTTP API integration", () => {
  it("POST /api/admin/auth accepts valid credentials", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: adminPassword() });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
    expect(readSetCookieHeader(response.headers).some((c) => c.startsWith("mq_admin="))).toBe(true);
  });

  it("POST /api/admin/auth rejects invalid credentials", async () => {
    const app = buildApp();
    const response = await request(app)
      .post("/api/admin/auth")
      .send({ login: "admin", password: "wrong-password" });
    expect(response.status).toBe(401);
  });

  it("POST /api/admin/rooms creates a room", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const slug = uniqueSlug("http-room");
    const response = await agent
      .post("/api/admin/rooms")
      .send({ eventName: slug, title: `HTTP ${slug}` });
    expect(response.status).toBe(201);
    expect(response.body.slug).toBe(slug);
  });

  it("GET /api/quiz/:quizId/state returns public state after join", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("http-state"));
    await setQuestionEnabled(quizId, question.id, true);
    await joinPlayer(eventName, "HTTP Player", "dev-http");

    const app = buildApp();
    const response = await request(app).get(`/api/quiz/${quizId}/state`);
    expect(response.status).toBe(200);
    expect(response.body.activeQuestion?.id).toBe(question.id);
  });

  it("returns 400 for invalid admin room payload", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const response = await agent.post("/api/admin/rooms").send({ title: "missing slug" });
    expect(response.status).toBe(400);
  });
});
