import { type Browser, type BrowserContext, expect, type Page } from "@playwright/test";
import { getE2eFixture } from "./fixture";

export async function joinAsPlayer(
  browser: Browser,
  nickname: string,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { slug } = getE2eFixture();
  await page.goto(`/q/${slug}`);
  await page.getByPlaceholder("Введите имя или используйте случайное").fill(nickname);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("button", { name: "Войти" })).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: nickname })).toBeVisible({ timeout: 15_000 });
  return { page, context };
}

export async function selectSingleOption(page: Page, optionText: string): Promise<void> {
  await page.getByRole("button", { name: optionText, exact: true }).click();
}

export async function submitAnswer(page: Page, questionText?: string): Promise<void> {
  const scope = questionText
    ? page.locator(".MuiCard-root").filter({ hasText: questionText })
    : page;
  const button = scope.getByRole("button", { name: "Отправить ответ" });
  await expect(button).toBeEnabled({ timeout: 10_000 });
  await button.click();
}
