import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAdminAgent } from "../helpers/integrationFixtures.js";

describe("Event themes API integration", () => {
  it("lists and edits built-in system themes", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);

    const listResponse = await agent.get("/api/admin/event-themes");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((item: { id: string }) => item.id === "default")).toBe(true);
    expect(listResponse.body.some((item: { id: string }) => item.id === "meyou")).toBe(true);

    const getResponse = await agent.get("/api/admin/event-themes/default");
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.system).toBe(true);
    expect(getResponse.body.branding.brandTheme).toBe("default");

    const updateResponse = await agent.put("/api/admin/event-themes/default").send({
      branding: { brandPrimaryColor: "#112233" },
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.branding.brandPrimaryColor).toBe("#112233");

    const deleteSystemResponse = await agent.delete("/api/admin/event-themes/default");
    expect(deleteSystemResponse.status).toBe(403);
  });

  it("lists each built-in theme once after saving overrides", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);

    const updateResponse = await agent.put("/api/admin/event-themes/meyou").send({
      branding: { brandPrimaryColor: "#AABBCC" },
    });
    expect(updateResponse.status).toBe(200);

    const listResponse = await agent.get("/api/admin/event-themes");
    expect(listResponse.status).toBe(200);

    const meyouItems = listResponse.body.filter((item: { id: string }) => item.id === "meyou");
    const defaultItems = listResponse.body.filter((item: { id: string }) => item.id === "default");

    expect(meyouItems).toHaveLength(1);
    expect(defaultItems).toHaveLength(1);
    expect(meyouItems[0].system).toBe(true);
    expect(meyouItems[0].name).toBe("MeYOU");
  });

  it("CRUDs global event themes under admin auth", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const name = `Theme ${Date.now()}`;

    const createResponse = await agent.post("/api/admin/event-themes").send({
      name,
      branding: { brandTheme: "meyou", brandPrimaryColor: "#F3F722" },
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe(name);
    expect(createResponse.body.branding.brandTheme).toBe("meyou");
    const themeId = createResponse.body.id as string;

    const listResponse = await agent.get("/api/admin/event-themes");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.some((item: { id: string }) => item.id === themeId)).toBe(true);
    expect(listResponse.body.filter((item: { system: boolean }) => item.system)).toHaveLength(2);

    const getResponse = await agent.get(`/api/admin/event-themes/${themeId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.branding.brandPrimaryColor).toBe("#F3F722");

    const updateResponse = await agent.put(`/api/admin/event-themes/${themeId}`).send({
      name: `${name} updated`,
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`${name} updated`);

    const duplicateResponse = await agent.post("/api/admin/event-themes").send({
      name: `${name} updated`,
      branding: {},
    });
    expect(duplicateResponse.status).toBe(409);

    const deleteResponse = await agent.delete(`/api/admin/event-themes/${themeId}`);
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await agent.get(`/api/admin/event-themes/${themeId}`);
    expect(missingResponse.status).toBe(404);
  });

  it("rejects unauthenticated access", async () => {
    const app = buildApp();
    const response = await request(app).get("/api/admin/event-themes");
    expect(response.status).toBe(401);
  });
});
