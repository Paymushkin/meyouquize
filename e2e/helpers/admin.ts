import { expect, type Page } from "@playwright/test";
import { getE2eFixture } from "./fixture";

const adminLogin = process.env.ADMIN_LOGIN ?? "admin";
const adminPassword = process.env.ADMIN_PASSWORD ?? "test-admin-password";
const apiBase = process.env.E2E_API_BASE ?? "http://127.0.0.1:4000";

export async function loginAdmin(page: Page, slug = getE2eFixture().slug): Promise<void> {
  const auth = await page.request.post(`${apiBase}/api/admin/auth`, {
    data: { login: adminLogin, password: adminPassword },
  });
  expect(auth.ok(), `admin auth failed: ${auth.status()} ${await auth.text()}`).toBeTruthy();

  await page.goto(`/admin/${slug}`);
  await expect(page.getByRole("button", { name: "Вопросы" })).toBeVisible({ timeout: 20_000 });
}

export async function openQuestionsTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Вопросы" }).click();
  await page.getByRole("tab", { name: "Квизы" }).click();
  const subQuizHeader = page.locator(".MuiAccordionSummary-root").filter({ hasText: "E2E Квиз" });
  if (await subQuizHeader.isVisible().catch(() => false)) {
    if ((await subQuizHeader.getAttribute("aria-expanded")) !== "true") {
      await subQuizHeader.click();
    }
    return;
  }
  const firstAccordion = page.locator(".MuiAccordionSummary-root").first();
  if (await firstAccordion.isVisible().catch(() => false)) {
    await firstAccordion.click();
  }
}

function quizQuestionsScope(page: Page) {
  return page.locator(".MuiAccordionDetails-root").first();
}

export async function deactivateAllVoteQuestions(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Вопросы" }).click();
  await page.getByRole("tab", { name: "Голосования" }).click();
  for (let i = 0; i < 4; i += 1) {
    const offButtons = page.getByRole("button", { name: "Отключить вопрос" });
    if ((await offButtons.count()) === 0) break;
    await offButtons.first().click();
  }
}

export async function deactivateFeedbackForm(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Вопросы" }).click();
  await page.getByRole("tab", { name: "Обратная связь" }).click();
  const offButtons = page.getByRole("button", { name: "Отключить форму на телефонах" });
  if ((await offButtons.count()) > 0) {
    await offButtons.first().click();
  }
}

export async function resetActivePlayerContent(page: Page): Promise<void> {
  await deactivateFeedbackForm(page);
  await deactivateAllVoteQuestions(page);
  await deactivateAllQuizQuestions(page);
}

export async function deactivateAllQuizQuestions(page: Page): Promise<void> {
  await openQuestionsTab(page);
  const scope = quizQuestionsScope(page);
  for (let i = 0; i < 8; i += 1) {
    const offButtons = scope.getByRole("button", { name: "Отключить вопрос" });
    if ((await offButtons.count()) === 0) break;
    await offButtons.first().click();
  }
}

export async function toggleQuizQuestion(page: Page, enabled: boolean, index = 0): Promise<void> {
  await openQuestionsTab(page);
  const label = enabled ? "Включить вопрос" : "Отключить вопрос";
  const scope = quizQuestionsScope(page);
  await scope.getByRole("button", { name: label }).nth(index).click();
  if (enabled) {
    await expect(scope.getByRole("button", { name: "Отключить вопрос" }).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}

export async function toggleVoteQuestion(page: Page, enabled: boolean): Promise<void> {
  await page.getByRole("button", { name: "Вопросы" }).click();
  const label = enabled ? "Включить вопрос" : "Отключить вопрос";
  await page.getByRole("tab", { name: "Голосования" }).click();
  await page.getByRole("button", { name: label }).first().click();
  if (enabled) {
    await expect(page.getByRole("button", { name: "Отключить вопрос" }).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}

export async function showQuestionOnProjector(page: Page, index = 0): Promise<void> {
  await quizQuestionsScope(page)
    .getByRole("button", { name: "Показать вопрос и варианты на экране" })
    .nth(index)
    .click();
}

export async function openFeedbackTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Вопросы" }).click();
  await page.getByRole("tab", { name: "Обратная связь" }).click();
}

export async function activateFeedbackForm(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Включить форму на телефонах" }).first().click();
}
