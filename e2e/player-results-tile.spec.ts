import { expect, test } from "@playwright/test";
import { loginAdmin, resetActivePlayerContent, toggleVoteQuestion } from "./helpers/admin";
import { joinAsPlayer, selectSingleOption, submitAnswer } from "./helpers/player";

test.describe("player results tile", () => {
  test("player sees vote results tile after standalone vote", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await resetActivePlayerContent(adminPage);
    await toggleVoteQuestion(adminPage, true);

    const { page: playerPage, context: playerContext } = await joinAsPlayer(
      browser,
      "E2E Vote Tile",
    );
    await expect(playerPage.getByRole("heading", { name: "E2E: голосование" })).toBeVisible({
      timeout: 30_000,
    });
    await selectSingleOption(playerPage, "Да");
    await submitAnswer(playerPage, "E2E: голосование");
    await expect(playerPage.getByText("Ответ принят")).toBeVisible({ timeout: 10_000 });

    await toggleVoteQuestion(adminPage, false);

    await playerPage.reload();
    await expect(playerPage.getByRole("button", { name: /E2E: голосование/ })).toBeVisible({
      timeout: 15_000,
    });
    await playerPage.getByRole("button", { name: /E2E: голосование/ }).click();
    await expect(playerPage.getByText("Результаты голосования")).toBeVisible({ timeout: 10_000 });

    await resetActivePlayerContent(adminPage);
    await playerContext.close();
    await adminContext.close();
  });
});
