import { Box, Container, Stack, Typography } from "@mui/material";
import { BrandPageLayout } from "../brand/BrandPageLayout";
import { BrandHeader } from "../brand/BrandHeader";
import { BrandFooter } from "../brand/BrandFooter";
import { BRAND_BORDER, BRAND_DISPLAY_FONT, BRAND_TEXT_MUTED } from "../../theme/brandTheme";
import {
  LANDING_CONTAINER_SX,
  LANDING_CONTACT_EMAIL,
  LANDING_CONTACT_PHONE_DISPLAY,
  LANDING_OPERATOR_ADDRESS,
  LANDING_OPERATOR_INN,
  LANDING_OPERATOR_NAME,
  LANDING_OPERATOR_OGRNIP,
  lt,
} from "./landingConstants";
import { LandingCookieBanner } from "./LandingCookieBanner";
import { DocumentSeo } from "./DocumentSeo";
import { buildOrganizationJsonLd } from "./landingSeo";

type LegalKind = "privacy" | "cookies";

const OPERATOR_BLOCK = lt(
  `${LANDING_OPERATOR_NAME}, ИНН ${LANDING_OPERATOR_INN}, ОГРНИП ${LANDING_OPERATOR_OGRNIP}, адрес: ${LANDING_OPERATOR_ADDRESS}. Контакты: ${LANDING_CONTACT_EMAIL}, тел. ${LANDING_CONTACT_PHONE_DISPLAY}.`,
);

/** Дата вступления документов в силу */
const LEGAL_EFFECTIVE_DATE = lt("5 ноября 2026 г.");

const CONTENT: Record<
  LegalKind,
  { title: string; documentTitle: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: lt("Политика конфиденциальности"),
    documentTitle: lt("Политика конфиденциальности - МИЮ"),
    sections: [
      {
        heading: lt("1. Оператор персональных данных"),
        body: OPERATOR_BLOCK,
      },
      {
        heading: lt("2. Общие положения"),
        body: lt(
          "Настоящая политика описывает обработку персональных данных оператором (бренд МИЮ) при использовании сайта и обращении по контактам. Формы сбора данных на сайте нет: связь только по e-mail и телефону.",
        ),
      },
      {
        heading: lt("3. Какие данные мы можем получать"),
        body: lt(
          "При обращении по почте или телефону - сведения, которые вы сами сообщаете: имя, компания, должность, e-mail, телефон, детали мероприятия и содержание переписки. При посещении сайта (после согласия на cookies) с помощью Яндекс.Метрики могут обрабатываться технические и аналитические данные: IP-адрес, сведения о браузере и устройстве, данные о посещениях страниц, источнике перехода, а также данные вебвизора и карты кликов.",
        ),
      },
      {
        heading: lt("4. Платформа на мероприятиях"),
        body: lt(
          "На ивентах участники подключаются к интерактивам через сервис МИЮ. В используемом сценарии участнику выдаётся случайный никнейм; персональные данные гостей через платформу мы не запрашиваем и не собираем. Ответы в опросах и квизах обрабатываются в обезличенном виде в привязке к никнейму/техническому идентификатору сессии. Если по договору с заказчиком потребуется иной режим (например, сбор контактов), условия обработки ПДн фиксируются в договоре с заказчиком, а участники дополнительно информируются на экране входа.",
        ),
      },
      {
        heading: lt("5. Для чего обрабатываем данные"),
        body: lt(
          "Чтобы ответить на обращение, подготовить предложение и обсудить мероприятие; провести интерактивы на площадке; вести статистику посещаемости сайта и улучшать его; выполнять требования закона. Рекламные и новостные рассылки не ведём.",
        ),
      },
      {
        heading: lt("6. Передача третьим лицам и место обработки"),
        body: lt(
          "Данные не продаём. Сайт и связанные сервисы размещаются на серверах на территории Российской Федерации. Шрифты сайта загружаются с нашего хостинга. Для аналитики сайта используется Яндекс.Метрика (ООО «ЯНДЕКС»). Также данные могут обрабатываться инфраструктурой хостинга и почтовым сервисом при переписке. Передача иным лицам - только если это нужно для ответа на обращение, исполнения договора с заказчиком или требуется законом.",
        ),
      },
      {
        heading: lt("7. Cookies и согласие"),
        body: lt(
          "Необходимые данные согласия хранятся в браузере. Аналитические cookies Яндекс.Метрики подключаются только после нажатия «Принять» в уведомлении. Подробнее - в Политике cookies.",
        ),
      },
      {
        heading: lt("8. Срок хранения и ваши права"),
        body: lt(
          "Переписку по e-mail и телефону, а также сообщённые в ней контактные данные храним в течение срока переговоров и до 3 лет с момента последнего обращения, если более длительный срок не нужен для договора или не требуется законом. Срок хранения данных Метрики определяется настройками сервиса Яндекс. Вы можете запросить уточнение, удаление или ограничение обработки, а также отозвать согласие на аналитику, написав оператору.",
        ),
      },
      {
        heading: lt("9. Контакты по вопросам ПДн"),
        body: lt(
          `Запросы по персональным данным направляйте на ${LANDING_CONTACT_EMAIL} или по тел. ${LANDING_CONTACT_PHONE_DISPLAY}.`,
        ),
      },
    ],
  },
  cookies: {
    title: lt("Политика cookies"),
    documentTitle: lt("Политика cookies - МИЮ"),
    sections: [
      {
        heading: lt("1. Оператор"),
        body: OPERATOR_BLOCK,
      },
      {
        heading: lt("2. Что такое cookies"),
        body: lt(
          "Cookies - небольшие файлы, которые сайт сохраняет в браузере. Они помогают сайту работать, запоминать настройки и понимать, как им пользуются.",
        ),
      },
      {
        heading: lt("3. Какие cookies мы используем"),
        body: lt(
          "Необходимые - сохранение факта вашего согласия на cookies в браузере. Аналитические - cookies Яндекс.Метрики (счётчик 114092887), включая функции вебвизора, карты кликов и учёта переходов. Они помогают понять, как пользуются сайтом.",
        ),
      },
      {
        heading: lt("4. Согласие"),
        body: lt(
          "При первом визите показываем уведомление. Яндекс.Метрика загружается только после нажатия «Принять». До согласия аналитические cookies не подключаем.",
        ),
      },
      {
        heading: lt("5. Как отключить cookies"),
        body: lt(
          "Вы можете удалить или ограничить cookies в настройках браузера, а также очистить сохранённое согласие. Без аналитических cookies сайт продолжит открываться; статистика посещений для нас станет недоступна или неполной.",
        ),
      },
      {
        heading: lt("6. Контакты"),
        body: lt(
          `Вопросы по cookies: ${LANDING_CONTACT_EMAIL}, тел. ${LANDING_CONTACT_PHONE_DISPLAY}.`,
        ),
      },
    ],
  },
};

export function LandingLegalPage({ kind }: { kind: LegalKind }) {
  const page = CONTENT[kind];

  const description =
    kind === "privacy"
      ? lt(
          "Политика конфиденциальности МИЮ: обработка персональных данных, контакты оператора и Яндекс.Метрика.",
        )
      : lt("Политика cookies МИЮ: необходимые cookies и Яндекс.Метрика после согласия.");

  return (
    <BrandPageLayout>
      <DocumentSeo
        title={page.documentTitle}
        description={description}
        path={kind === "privacy" ? "/privacy" : "/cookies"}
        jsonLd={buildOrganizationJsonLd()}
      />
      <BrandHeader showDemoButton={false} />
      <Box
        component="main"
        sx={{
          flex: 1,
          py: { xs: 6, md: 9 },
          borderTop: `1px solid ${BRAND_BORDER}`,
        }}
      >
        <Container maxWidth={false} sx={LANDING_CONTAINER_SX}>
          <Stack spacing={3.5} sx={{ maxWidth: 760 }}>
            <Stack spacing={1}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: BRAND_DISPLAY_FONT,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  fontSize: { xs: "2rem", md: "2.75rem" },
                  lineHeight: 1.05,
                }}
              >
                {page.title}
              </Typography>
              <Typography sx={{ color: BRAND_TEXT_MUTED, fontSize: 14 }}>
                {lt("Дата вступления в силу")}: {LEGAL_EFFECTIVE_DATE}
              </Typography>
            </Stack>
            {page.sections.map((section) => (
              <Stack key={section.heading} spacing={1}>
                <Typography
                  sx={{
                    fontFamily: BRAND_DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: { xs: "1.05rem", md: "1.15rem" },
                    letterSpacing: "-0.02em",
                  }}
                >
                  {section.heading}
                </Typography>
                <Typography sx={{ color: BRAND_TEXT_MUTED, lineHeight: 1.65 }}>
                  {section.body}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>
      <BrandFooter />
      <LandingCookieBanner />
    </BrandPageLayout>
  );
}

export function LandingPrivacyPage() {
  return <LandingLegalPage kind="privacy" />;
}

export function LandingCookiesPage() {
  return <LandingLegalPage kind="cookies" />;
}
