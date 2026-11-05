export const LANDING_CONTACT_EMAIL = "a.xeva.a@yandex.ru";
export const LANDING_CONTACT_PHONE_DISPLAY = "+7 917 536-57-15";
export const LANDING_CONTACT_PHONE_TEL = "tel:+79175365715";

/** Реквизиты оператора ПДн (ИП) */
export const LANDING_OPERATOR_NAME = "Индивидуальный предприниматель Алексеева Анна Дмитриевна";
export const LANDING_OPERATOR_INN = "504512539445";
export const LANDING_OPERATOR_OGRNIP = "318502200039303";
export const LANDING_OPERATOR_ADDRESS =
  "Россия, Московская область, Ступинский район, д. Городище, ул. Молодёжная, д. 2, кв. 12, 142811";

export const LANDING_REQUEST_MAILTO =
  `mailto:${LANDING_CONTACT_EMAIL}?subject=` + encodeURIComponent("Обсудить мероприятие");

export const LANDING_COOKIE_CONSENT_KEY = "miyu_landing_cookie_consent_v1";
export const LANDING_YANDEX_METRIKA_ID = 114092887;

export const LANDING_CANVAS_MAX_WIDTH = 1440;

/** Container: maxWidth={false} + этот sx — иначе MuiContainer-maxWidthLg держит 1200px */
export const LANDING_CONTAINER_SX = {
  maxWidth: LANDING_CANVAS_MAX_WIDTH,
  px: { xs: 2, sm: 3, md: 4 },
} as const;

const NBSP = "\u00A0";

/**
 * Типографика лендинга: длинное тире → дефис;
 * неразрывный пробел после коротких предлогов и союзов (без висячих переносов).
 */
export function lt(text: string): string {
  return text
    .replace(/\u2014|\u2013|—|–/g, "-")
    .replace(
      /(?<![\p{L}\p{N}_])(в|во|с|со|к|ко|у|о|об|обо|на|по|из|за|от|до|без|для|при|про|над|под|перед|через|между|не|ни|и|а|но|да|или) /giu,
      `$1${NBSP}`,
    );
}
