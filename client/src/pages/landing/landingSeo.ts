import {
  LANDING_CONTACT_EMAIL,
  LANDING_CONTACT_PHONE_DISPLAY,
  LANDING_OPERATOR_ADDRESS,
  LANDING_OPERATOR_INN,
  LANDING_OPERATOR_NAME,
  LANDING_OPERATOR_OGRNIP,
  lt,
} from "./landingConstants";

/** Основной домен для canonical / OG / sitemap */
export const LANDING_SITE_ORIGIN = "https://ameyou.ru";
/** Зеркало: в выдаче не конкурирует - canonical всегда на основной домен */
export const LANDING_MIRROR_ORIGIN = "https://meyou.site";

export const LANDING_SEO = {
  title: lt("МИЮ - интерактивы и флеш-интервью для живых мероприятий"),
  description: lt(
    "Интерактивы для всего зала и флеш-интервью с гостями под вашим брендом. QR без приложений, живой экран, команда на площадке. От 40 000 ₽/день, до 1500 участников онлайн.",
  ),
  keywords: lt(
    "интерактивы для мероприятий, интерактив на конференции, интерактив на корпоративе, QR-квиз, голосование с телефона, голосование в зале, вопросы спикерам, облако тегов, розыгрыш на большом экране, флеш-интервью, брендированное интервью с гостями, МИЮ",
  ),
  ogImagePath: "/og-cover.jpg",
  locale: "ru_RU",
} as const;

export type DocumentSeoInput = {
  title: string;
  description: string;
  path?: string;
  imagePath?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${LANDING_SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "МИЮ",
    legalName: LANDING_OPERATOR_NAME,
    url: LANDING_SITE_ORIGIN,
    logo: absoluteUrl("/logo.svg"),
    email: LANDING_CONTACT_EMAIL,
    telephone: LANDING_CONTACT_PHONE_DISPLAY,
    taxID: LANDING_OPERATOR_INN,
    identifier: LANDING_OPERATOR_OGRNIP,
    address: {
      "@type": "PostalAddress",
      addressCountry: "RU",
      streetAddress: LANDING_OPERATOR_ADDRESS,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: LANDING_CONTACT_EMAIL,
      telephone: LANDING_CONTACT_PHONE_DISPLAY,
      availableLanguage: ["Russian"],
    },
    sameAs: [LANDING_MIRROR_ORIGIN],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "МИЮ",
    url: LANDING_SITE_ORIGIN,
    inLanguage: "ru-RU",
    publisher: { "@type": "Organization", name: "МИЮ", url: LANDING_SITE_ORIGIN },
  };
}

export function buildServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: lt("Интерактивы и флеш-интервью для мероприятий"),
    serviceType: lt("Организация интерактивов на мероприятиях"),
    provider: { "@type": "Organization", name: "МИЮ", url: LANDING_SITE_ORIGIN },
    areaServed: { "@type": "Country", name: "RU" },
    description: LANDING_SEO.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: "40000",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "40000",
        priceCurrency: "RUB",
        unitText: "DAY",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "DAY",
        },
      },
      description: lt("Минимальная стоимость от 40 000 ₽ в день"),
      url: absoluteUrl("/#request"),
    },
  };
}

export function buildFaqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
