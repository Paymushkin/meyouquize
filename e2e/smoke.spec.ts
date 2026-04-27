import { expect, test } from "@playwright/test";

test("приложение открывается и показывает основной контейнер", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeVisible();
  await expect(page).toHaveTitle(/Meyouquize/i);
});
