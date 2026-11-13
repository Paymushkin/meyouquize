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
/** Предыдущая версия продукта (тот же бренд) */
export const LANDING_LEGACY_ORIGIN = "https://meyou.ru";

export const LANDING_BRAND_NAME = "МИЮ";
export const LANDING_BRAND_ALT_NAMES = ["MeYou", "meyou", "МИЮ MeYou"] as const;

export const LANDING_SEO = {
  title: lt("МИЮ (MeYou) - интерактивы и флеш-интервью для живых мероприятий"),
  description: lt(
    "МИЮ (ранее MeYou, meyou.ru) - интерактивы для зала и флеш-интервью с гостями: QR-квиз, голосования, вопросы спикерам, облако тегов. Без приложений, команда на площадке. От 40 000 ₽/день.",
  ),
  keywords: lt(
    "МИЮ, MeYou, meyou, meyou.ru, ameyou.ru, интерактивы для мероприятий, квиз на мероприятие, интерактивы на корпоратив, интерактив на конференции, QR-квиз, голосование с телефона, голосование в зале, вопросы спикерам, облако тегов, флеш-интервью, mentimeter аналог, аналог mentimeter для россии",
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
    name: LANDING_BRAND_NAME,
    alternateName: [...LANDING_BRAND_ALT_NAMES],
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
    sameAs: [LANDING_LEGACY_ORIGIN, LANDING_MIRROR_ORIGIN],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: LANDING_BRAND_NAME,
    alternateName: [...LANDING_BRAND_ALT_NAMES],
    url: LANDING_SITE_ORIGIN,
    inLanguage: "ru-RU",
    publisher: {
      "@type": "Organization",
      name: LANDING_BRAND_NAME,
      url: LANDING_SITE_ORIGIN,
    },
  };
}

export function buildServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: lt("Интерактивы и флеш-интервью для мероприятий"),
    alternateName: [
      lt("MeYou интерактивы"),
      lt("МИЮ интерактивы"),
      lt("Аналог Mentimeter для живого зала"),
    ],
    serviceType: lt("Организация интерактивов на мероприятиях"),
    provider: {
      "@type": "Organization",
      name: LANDING_BRAND_NAME,
      alternateName: [...LANDING_BRAND_ALT_NAMES],
      url: LANDING_SITE_ORIGIN,
    },
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
