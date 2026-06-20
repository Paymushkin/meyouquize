import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_VIEW_STATE } from "@meyouquize/shared";
import { getPublicReportBySlug } from "../../src/quiz-service.js";
import { saveStoredPublicView } from "../../src/socket/public-view-store.js";
import { seedSingleChoiceQuiz, uniqueSlug } from "../helpers/integrationFixtures.js";

describe("randomizer public view integration", () => {
  it("persists randomizer winners and exposes them in published report", async () => {
    const { eventName, quizId } = await seedSingleChoiceQuiz(uniqueSlug("randomizer"));
    await saveStoredPublicView(quizId, {
      ...DEFAULT_PUBLIC_VIEW_STATE,
      reportPublished: true,
      reportModules: ["randomizer_summary"],
      randomizerMode: "names",
      randomizerTitle: "E2E Randomizer",
      randomizerCurrentWinners: ["Алиса", "Борис"],
      randomizerHistory: [
        {
          timestamp: "2026-06-01T12:00:00.000Z",
          winners: ["Алиса"],
          mode: "names",
        },
      ],
    });

    const report = await getPublicReportBySlug(eventName);
    expect(report).not.toBeNull();
    expect(report?.randomizer.currentWinners).toEqual(["Алиса", "Борис"]);
    expect(report?.randomizer.history[0]?.winners).toEqual(["Алиса"]);
  });
});
