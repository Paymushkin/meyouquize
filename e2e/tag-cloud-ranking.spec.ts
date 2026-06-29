import { expect, test } from "@playwright/test";
import { loginAdmin, resetActivePlayerContent, toggleQuizQuestion } from "./helpers/admin";
import { joinAsPlayer, submitAnswer } from "./helpers/player";

test.describe("tag cloud and ranking", () => {
  test.beforeEach(async ({ browser }) => {
    const adminPage = await browser.newPage();
    await loginAdmin(adminPage);
    await resetActivePlayerContent(adminPage);
    await adminPage.close();
  });

  test("submits tag cloud answers", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await resetActivePlayerContent(adminPage);
    await toggleQuizQuestion(adminPage, true, 1);

    const { page: playerPage, context: playerContext } = await joinAsPlayer(
      browser,
      "E2E Tag Player",
    );
    await expect(playerPage.getByText("E2E: облако тегов")).toBeVisible({ timeout: 30_000 });
    await playerPage.getByPlaceholder("Ответ 1").fill("тег-эталон");
    await submitAnswer(playerPage, "E2E: облако тегов");
    await expect(playerPage.getByText("E2E: облако тегов")).not.toBeVisible({ timeout: 10_000 });

    await resetActivePlayerContent(adminPage);
    await playerContext.close();
    await adminContext.close();
  });

  test("submits ranking after reorder", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await resetActivePlayerContent(adminPage);
    await toggleQuizQuestion(adminPage, true, 2);

    const { page: playerPage, context: playerContext } = await joinAsPlayer(
      browser,
      "E2E Rank Player",
    );
    const rankingCard = playerPage
      .locator(".MuiCard-root")
      .filter({ hasText: "E2E: ранжирование" });
    await expect(rankingCard).toBeVisible({ timeout: 30_000 });
    await rankingCard.getByRole("button", { name: "Ниже" }).first().click();
    await expect(rankingCard.getByRole("button", { name: "Отправить ответ" })).toBeEnabled();
    await submitAnswer(playerPage, "E2E: ранжирование");
    await expect(playerPage.getByText("Квиз завершён")).toBeVisible({ timeout: 15_000 });

    await resetActivePlayerContent(adminPage);
    await playerContext.close();
  });
});
