import { expect, test } from "@playwright/test";
import {
  loginAdmin,
  resetActivePlayerContent,
  showQuestionOnProjector,
  toggleQuizQuestion,
} from "./helpers/admin";
import { joinAsPlayer, selectSingleOption, submitAnswer } from "./helpers/player";

test.describe("player vote flow", () => {
  test("join → answer single question → popup closes", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await resetActivePlayerContent(adminPage);
    await toggleQuizQuestion(adminPage, true, 0);
    await showQuestionOnProjector(adminPage, 0);

    const { page: playerPage, context: playerContext } = await joinAsPlayer(browser, "E2E Player");
    await expect(playerPage.getByText("E2E: выберите один")).toBeVisible({ timeout: 30_000 });
    await selectSingleOption(playerPage, "Вариант А");
    await submitAnswer(playerPage, "E2E: выберите один");
    await expect(playerPage.getByText("E2E: выберите один")).not.toBeVisible({ timeout: 10_000 });

    await resetActivePlayerContent(adminPage);
    await playerContext.close();
    await adminContext.close();
  });
});
