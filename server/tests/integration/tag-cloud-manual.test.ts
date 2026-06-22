import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { resetProjectorViewOnStartup } from "../../src/startup-checks.js";
import { getStoredPublicView } from "../../src/socket/public-view-store.js";
import {
  createAdminAgent,
  seedSingleChoiceQuiz,
  uniqueSlug,
} from "../helpers/integrationFixtures.js";

describe("tag cloud manual persistence", () => {
  it("persists injected tags via PATCH and survives projector startup reset", async () => {
    const { eventName, quizId, question } = await seedSingleChoiceQuiz(uniqueSlug("tag-manual"));
    const app = buildApp();
    const agent = await createAdminAgent(app);

    const manual = {
      [question.id]: {
        hiddenTagTexts: [],
        injectedTagWords: [{ text: "врач", count: 10 }],
        tagCountOverrides: [],
      },
    };

    const patch = await agent
      .patch(`/api/admin/rooms/${eventName}/tag-cloud-manual`)
      .send({ tagCloudManualByQuestionId: manual });
    expect(patch.status).toBe(200);

    const stored = await getStoredPublicView(quizId);
    expect(stored.tagCloudManualByQuestionId[question.id]?.injectedTagWords).toEqual([
      { text: "врач", count: 10 },
    ]);

    await resetProjectorViewOnStartup();

    const afterRestart = await getStoredPublicView(quizId);
    expect(afterRestart.tagCloudManualByQuestionId[question.id]?.injectedTagWords).toEqual([
      { text: "врач", count: 10 },
    ]);

    const room = await agent.get(`/api/admin/rooms/${eventName}`);
    expect(room.status).toBe(200);
    expect(room.body.publicView?.tagCloudManualByQuestionId?.[question.id]).toEqual(
      manual[question.id],
    );
  });
});
