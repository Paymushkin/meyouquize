import { expect, test } from "@playwright/test";
import { getE2eFixture } from "./helpers/fixture";
import {
  deactivateAllQuizQuestions,
  loginAdmin,
  openQuestionsTab,
  showQuestionOnProjector,
  toggleQuizQuestion,
} from "./helpers/admin";

test.describe("projector display", () => {
  test("shows question title on /p/:slug after admin enables it", async ({ page }) => {
    const { slug } = getE2eFixture();
    await loginAdmin(page);
    await deactivateAllQuizQuestions(page);
    await toggleQuizQuestion(page, true, 0);
    await showQuestionOnProjector(page, 0);

    // Отдельная вкладка: уход с админки рвёт сокет и может сбросить view.
    const projector = await page.context().newPage();
    await projector.goto(`/p/${slug}`);
    await expect(projector.getByText("E2E: выберите один")).toBeVisible({ timeout: 20_000 });
    await projector.close();
  });
});
