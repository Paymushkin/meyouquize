import { expect, test } from "@playwright/test";

const mockRoom = {
  id: "quiz-demo",
  slug: "demo",
  title: "Demo Quiz",
  subQuizzes: [],
  questions: [],
  publicView: {
    mode: "question",
    speakerQuestionsEnabled: true,
    speakerQuestionsSpeakers: ["Иванов", "Сидоров"],
    speakerQuestionsShowAuthorOnScreen: false,
    speakerQuestionsShowRecipientOnScreen: true,
    speakerQuestionsShowReactionsOnScreen: true,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/admin/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    if (pathname.endsWith("/api/admin/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    if (pathname.endsWith("/api/admin/rooms/demo")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRoom),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
});

test("админка: секция спикеров и колонки таблиц доступны", async ({ page }) => {
  await page.goto("/admin/demo");

  await page.getByRole("button", { name: "Q&A" }).click();

  await expect(page.getByText("Вопросы спикерам")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "UI" }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Мод." }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Экран" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Скрыть" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Вернуть" })).toBeVisible();
});

test("админка: таблица скрытых вопросов содержит колонку UI", async ({ page }) => {
  await page.goto("/admin/demo");
  await page.getByRole("button", { name: "Q&A" }).click();

  const hiddenSection = page.locator("section, div").filter({ hasText: "Скрытые вопросы" }).first();
  await expect(hiddenSection.getByRole("columnheader", { name: "UI" }).first()).toBeVisible();
  // Колонка «Экран» может отображаться и для скрытых вопросов — проверяем только наличие UI.
});

test("админка: панель настроек спикеров содержит все элементы", async ({ page }) => {
  await page.goto("/admin/demo");
  await page.getByRole("button", { name: "Q&A" }).click();
  await page.getByRole("button", { name: "Настройки" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Кнопка у пользователей")).toBeVisible();
  await expect(dialog.getByText("Автор на экране")).toBeVisible();
  await expect(dialog.getByLabel("Реакции (по одной в строке, например 👍)")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Готово" })).toBeVisible();
});
