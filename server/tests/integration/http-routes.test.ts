import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import {
  createAdminAgent,
  joinPlayer,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";
import { setQuestionEnabled } from "../../src/quiz-service.js";
import { saveStoredPublicView } from "../../src/socket/public-view-store.js";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";

describe("HTTP routes integration", () => {
  it("GET /healthz and /readyz respond", async () => {
    const app = buildApp();
    const health = await request(app).get("/healthz");
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const ready = await request(app).get("/readyz");
    expect(ready.status).toBe(200);
    expect(ready.body.ok).toBe(true);
  });

  it("GET /api/admin/me requires auth", async () => {
    const app = buildApp();
    const unauthorized = await request(app).get("/api/admin/me");
    expect(unauthorized.status).toBe(401);

    const agent = await createAdminAgent(app);
    const ok = await agent.get("/api/admin/me");
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
  });

  it("GET /api/admin/rooms/:eventName/participants lists joined players", async () => {
    const { eventName } = await seedSingleChoiceQuiz(uniqueSlug("participants"));
    await joinPlayer(eventName, "Listed Player", "dev-list");
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const response = await agent.get(`/api/admin/rooms/${eventName}/participants`);
    expect(response.status).toBe(200);
    expect(response.body.nicknames.some((nickname: string) => nickname === "Listed Player")).toBe(
      true,
    );
  });

  it("GET /api/quiz/by-slug/:slug/meta returns branding fields", async () => {
    const { eventName, quizId } = await seedSingleChoiceQuiz(uniqueSlug("meta"));
    await saveStoredPublicView(quizId, {
      ...DEFAULT_PUBLIC_VIEW_STATE,
      brandPrimaryColor: "#112233",
      brandAccentColor: "#445566",
      brandFontFamily: "Montserrat, Arial, sans-serif",
      brandFontUrl: "/media/fonts/montserrat.woff2",
    });
    const app = buildApp();
    const response = await request(app).get(`/api/quiz/by-slug/${eventName}/meta`);
    expect(response.status).toBe(200);
    expect(response.body.brandPrimaryColor).toBe("#112233");
    expect(response.body.brandFontFamily).toBe("Montserrat, Arial, sans-serif");
    expect(response.body.brandFontUrl).toBe("/media/fonts/montserrat.woff2");
    expect(response.body.slug).toBe(eventName);
  });

  it("GET /api/quiz/:quizId/results returns question stats payload", async () => {
    const { quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("results-http"));
    await setQuestionEnabled(quizId, question.id, true);
    const app = buildApp();
    const response = await request(app).get(`/api/quiz/${quizId}/results`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.perQuestion)).toBe(true);
    expect(
      response.body.perQuestion.some((q: { questionId: string }) => q.questionId === question.id),
    ).toBe(true);
  });
});
