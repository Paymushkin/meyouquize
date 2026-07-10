import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAdminAgent } from "../helpers/integrationFixtures.js";
import { env } from "../../src/env.js";

describe("Admin fonts API integration", () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const file of tempFiles.splice(0)) {
      try {
        fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
  });

  function writeTempFont(name: string, payload = "") {
    const file = path.join(os.tmpdir(), `${name}-${Date.now()}.woff2`);
    fs.writeFileSync(file, `wOF2${payload}`);
    tempFiles.push(file);
    return file;
  }

  it("uploads static batch and deletes one face", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const family = `Family ${Date.now()}`;
    const token = Date.now();

    const uploadResponse = await agent
      .post("/api/admin/fonts/upload")
      .field("family", family)
      .field("kind", "static")
      .attach("files", writeTempFont("regular", `-${token}-regular`), "Family-Regular.woff2")
      .attach("files", writeTempFont("bold", `-${token}-bold`), "Family-Bold.woff2");

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.fonts).toHaveLength(2);

    const listResponse = await agent.get("/api/admin/fonts");
    expect(listResponse.status).toBe(200);
    const uploaded = (listResponse.body.fonts as Array<{ id: string; family: string }>).filter(
      (font) => font.family === family,
    );
    expect(uploaded).toHaveLength(2);

    const deleteResponse = await agent.delete(`/api/admin/fonts/${uploaded[0]!.id}`);
    expect(deleteResponse.status).toBe(204);

    const listAfterDelete = await agent.get("/api/admin/fonts");
    const remaining = (listAfterDelete.body.fonts as Array<{ family: string }>).filter(
      (font) => font.family === family,
    );
    expect(remaining).toHaveLength(1);
  });

  it("rejects variable upload with multiple files", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const response = await agent
      .post("/api/admin/fonts/upload")
      .field("family", `Var ${Date.now()}`)
      .field("kind", "variable")
      .attach("files", writeTempFont("v1", "v1"), "Var.woff2")
      .attach("files", writeTempFont("v2", "v2"), "Var-2.woff2");
    expect(response.status).toBe(400);
  });

  it("rejects static upload when variable family exists", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const family = `Blocked ${Date.now()}`;
    const token = Date.now();

    const variableResponse = await agent
      .post("/api/admin/fonts/upload")
      .field("family", family)
      .field("kind", "variable")
      .attach("files", writeTempFont("variable", `-${token}-variable`), "Family-Variable.woff2");
    expect(variableResponse.status).toBe(201);

    const staticResponse = await agent
      .post("/api/admin/fonts/upload")
      .field("family", family)
      .field("kind", "static")
      .attach("files", writeTempFont("regular", `-${token}-static`), "Family-Regular.woff2");
    expect(staticResponse.status).toBe(409);
    expect(staticResponse.body.rejectedCount).toBe(1);

    const registry = path.join(env.mediaDir, "fonts-registry.json");
    if (fs.existsSync(registry)) {
      const parsed = JSON.parse(fs.readFileSync(registry, "utf-8")) as {
        fonts: Array<{ family: string; url: string }>;
      };
      for (const font of parsed.fonts.filter((item) => item.family === family)) {
        const match = font.url.match(/\/media\/([^/?#]+)$/);
        if (match?.[1]) {
          const mediaPath = path.join(env.mediaDir, match[1]);
          if (fs.existsSync(mediaPath)) fs.unlinkSync(mediaPath);
        }
      }
      const next = parsed.fonts.filter((item) => item.family !== family);
      fs.writeFileSync(registry, JSON.stringify({ fonts: next }, null, 2));
    }
  });
});
