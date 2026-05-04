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

  await page.getByRole("button", { name: "Спикеры" }).click();

  await expect(page.getByText("Вопросы спикерам")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "UI" }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Экран" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Скрыть" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Вернуть" })).toBeVisible();
});

test("админка: в таблице скрытых вопросов нет колонки Экран", async ({ page }) => {
  await page.goto("/admin/demo");
  await page.getByRole("button", { name: "Спикеры" }).click();

  const hiddenSection = page.locator("section, div").filter({ hasText: "Скрытые вопросы" }).first();
  await expect(hiddenSection.getByRole("columnheader", { name: "Экран" })).toHaveCount(0);
  await expect(hiddenSection.getByRole("columnheader", { name: "UI" })).toBeVisible();
});

test("админка: панель настроек спикеров содержит все элементы", async ({ page }) => {
  await page.goto("/admin/demo");
  await page.getByRole("button", { name: "Спикеры" }).click();

  await expect(page.getByLabel("Кнопка у пользователей")).toBeVisible();
  await expect(page.getByLabel("Автор на экране")).toBeVisible();
  await expect(page.getByLabel("Реакции (по одной в строке, например 👍)")).toBeVisible();
  await expect(page.getByLabel("Список спикеров (по одному в строке)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Сохранить настройки" })).toBeVisible();
});
