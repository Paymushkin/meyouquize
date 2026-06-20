import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { createAdminAgent } from "../helpers/integrationFixtures.js";

describe("media upload integration", () => {
  it("POST /api/admin/media/upload stores image and returns url", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );

    const response = await agent
      .post("/api/admin/media/upload")
      .attach("file", png, { filename: "tile.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/\/media\/.+\.png$/);
    expect(response.body.mimeType).toBe("image/png");

    const mediaDir = process.env.MEDIA_DIR!;
    const filename = path.basename(String(response.body.url));
    expect(fs.existsSync(path.join(mediaDir, filename))).toBe(true);
  });

  it("rejects upload without auth", async () => {
    const app = buildApp();
    const response = await request(app).post("/api/admin/media/upload");
    expect(response.status).toBe(401);
  });

  it("rejects non-image upload", async () => {
    const app = buildApp();
    const agent = await createAdminAgent(app);
    const response = await agent
      .post("/api/admin/media/upload")
      .attach("file", Buffer.from("not-an-image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });
    expect(response.status).toBe(400);
  });
});
