import { expect, test } from "@playwright/test";
import { getE2eFixture } from "./helpers/fixture";
import {
  deactivateAllQuizQuestions,
  loginAdmin,
  openQuestionsTab,
  showQuestionOnProjector,
  toggleQuizQuestion,
} from "./helpers/admin";

test.describe("admin question flow", () => {
  test("login → enable question → projector shows options → disable", async ({ page }) => {
    const { slug } = getE2eFixture();
    await loginAdmin(page);
    await deactivateAllQuizQuestions(page);
    await openQuestionsTab(page);
    await toggleQuizQuestion(page, true, 0);
    await showQuestionOnProjector(page, 0);

    const projector = await page.context().newPage();
    await projector.goto(`/p/${slug}`);
    await expect(projector.getByText("E2E: выберите один")).toBeVisible({ timeout: 20_000 });

    await deactivateAllQuizQuestions(page);
    await projector.close();
  });
});
