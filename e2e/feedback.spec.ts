import { expect, test } from "@playwright/test";
import {
  deactivateFeedbackForm,
  loginAdmin,
  openFeedbackTab,
  activateFeedbackForm,
} from "./helpers/admin";
import { joinAsPlayer, submitAnswer } from "./helpers/player";

test.describe("feedback flow", () => {
  test("admin activates feedback → player submits scale answer", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    await openFeedbackTab(adminPage);
    await activateFeedbackForm(adminPage);

    const { page: playerPage, context: playerContext } = await joinAsPlayer(
      browser,
      "E2E Feedback Player",
    );
    await expect(playerPage.getByText("E2E Feedback")).toBeVisible({ timeout: 15_000 });
    await playerPage.getByRole("button", { name: "3" }).click();
    await submitAnswer(playerPage);
    await expect(playerPage.getByRole("button", { name: "Отправить ответ" })).not.toBeVisible({
      timeout: 10_000,
    });

    await deactivateFeedbackForm(adminPage);
    await playerContext.close();
    await adminContext.close();
  });
});
