import { BrandPageLayout } from "./brand/BrandPageLayout";
import { BrandHeader } from "./brand/BrandHeader";
import { BrandFooter } from "./brand/BrandFooter";
import { ErrorMessage } from "./brand/ErrorMessage";

export function NotFoundPage() {
  return (
    <BrandPageLayout documentTitle="404 — Страница не найдена · Meyouquize">
      <BrandHeader />
      <ErrorMessage
        code="404"
        title="Страница не найдена"
        description="Похоже, такой страницы нет или ссылка устарела. Проверьте адрес или вернитесь на главную."
        actions={[
          { label: "На главную", to: "/", variant: "contained" },
          { label: "Попробовать демо", to: "/q/demo", variant: "outlined" },
        ]}
      />
      <BrandFooter />
    </BrandPageLayout>
  );
}
