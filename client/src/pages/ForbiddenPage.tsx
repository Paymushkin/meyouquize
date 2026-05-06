import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { BrandFooter } from "./brand/BrandFooter";
import { ErrorMessage } from "./brand/ErrorMessage";

export function ForbiddenPage() {
  return (
    <BrandPageLayout documentTitle="403 — Доступ запрещён · Meyouquize">
      <BrandHeader />
      <ErrorMessage
        code="403"
        title="Доступ запрещён"
        description="У вас нет прав для просмотра этой страницы. Если это ошибка, войдите в админку под нужным аккаунтом или вернитесь на главную."
        actions={[
          { label: "На главную", to: "/", variant: "contained" },
          { label: "Войти в админку", to: "/admin", variant: "outlined" },
        ]}
      />
      <BrandFooter />
    </BrandPageLayout>
  );
}
