/** Форма входа при включённом нетворкинге. */
export type NetworkingJoinFormMode = "interactive" | "networking" | "pharma";

/** Видимость и обязательность полей формы нетворкинга (ФИО всегда обязательно). */
export type NetworkingJoinFormFields = {
  company: boolean;
  offers: boolean;
  seeking: boolean;
  phone: boolean;
  email: boolean;
  companyRequired: boolean;
  offersRequired: boolean;
  seekingRequired: boolean;
  phoneRequired: boolean;
  emailRequired: boolean;
};

export const DEFAULT_NETWORKING_JOIN_FORM_FIELDS: NetworkingJoinFormFields = {
  company: true,
  offers: true,
  seeking: true,
  phone: false,
  email: false,
  companyRequired: false,
  offersRequired: false,
  seekingRequired: false,
  phoneRequired: false,
  emailRequired: false,
};

/** Подписи и плейсхолдеры полей «полезен» / «ищу» (режим networking). */
export type NetworkingJoinFormCopy = {
  offersLabel: string;
  seekingLabel: string;
  offersPlaceholder: string;
  seekingPlaceholder: string;
  /** URL документа об обработке ПД; пусто — блок согласия не показываем. */
  privacyPolicyUrl: string;
};

export const DEFAULT_NETWORKING_JOIN_FORM_COPY: NetworkingJoinFormCopy = {
  offersLabel: "Чем полезен",
  seekingLabel: "Что ищу",
  offersPlaceholder: "",
  seekingPlaceholder: "",
  privacyPolicyUrl: "",
};

/** Текст согласия у кнопки «Войти» (ссылка — на `privacyPolicyUrl`). */
export const NETWORKING_JOIN_PRIVACY_CONSENT_PREFIX = "Нажимая кнопку «Войти» вы соглашаетесь на";
export const NETWORKING_JOIN_PRIVACY_CONSENT_LINK_LABEL = "обработку персональных данных";

const LABEL_MAX = 60;
const PLACEHOLDER_MAX = 160;
const PRIVACY_URL_MAX = 500;

function sanitizeJoinFormLabel(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const next = raw.trim().slice(0, LABEL_MAX);
  return next || fallback;
}

function sanitizeJoinFormPlaceholder(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PLACEHOLDER_MAX);
}

function sanitizePrivacyPolicyUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let trimmed = raw.trim().slice(0, PRIVACY_URL_MAX);
  if (!trimmed) return "";
  // Без схемы — считаем https (иначе «example.com» не сохранялся бы).
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return trimmed;
  } catch {
    return "";
  }
  return "";
}

export function normalizeNetworkingJoinFormCopy(raw: unknown): NetworkingJoinFormCopy {
  const src =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  return {
    offersLabel: sanitizeJoinFormLabel(
      src.offersLabel,
      DEFAULT_NETWORKING_JOIN_FORM_COPY.offersLabel,
    ),
    seekingLabel: sanitizeJoinFormLabel(
      src.seekingLabel,
      DEFAULT_NETWORKING_JOIN_FORM_COPY.seekingLabel,
    ),
    offersPlaceholder: sanitizeJoinFormPlaceholder(src.offersPlaceholder),
    seekingPlaceholder: sanitizeJoinFormPlaceholder(src.seekingPlaceholder),
    privacyPolicyUrl: sanitizePrivacyPolicyUrl(src.privacyPolicyUrl),
  };
}

export function normalizeNetworkingJoinFormMode(raw: unknown): NetworkingJoinFormMode {
  if (raw === "interactive" || raw === "networking" || raw === "pharma") return raw;
  if (raw === "simple") return "interactive";
  if (raw === "full") return "networking";
  return "interactive";
}

function readFieldFlag(src: Record<string, unknown>, key: keyof NetworkingJoinFormFields): boolean {
  const value = src[key];
  return typeof value === "boolean" ? value : DEFAULT_NETWORKING_JOIN_FORM_FIELDS[key];
}

export function normalizeNetworkingJoinFormFields(raw: unknown): NetworkingJoinFormFields {
  const src =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const company = readFieldFlag(src, "company");
  const offers = readFieldFlag(src, "offers");
  const seeking = readFieldFlag(src, "seeking");
  const phone = readFieldFlag(src, "phone");
  const email = readFieldFlag(src, "email");
  return {
    company,
    offers,
    seeking,
    phone,
    email,
    companyRequired: company && readFieldFlag(src, "companyRequired"),
    offersRequired: offers && readFieldFlag(src, "offersRequired"),
    seekingRequired: seeking && readFieldFlag(src, "seekingRequired"),
    phoneRequired: phone && readFieldFlag(src, "phoneRequired"),
    emailRequired: email && readFieldFlag(src, "emailRequired"),
  };
}

/** Текстовые поля профиля (join + «Мой профиль»). */
export type NetworkingProfileTextFields = {
  fullName: string;
  jobTitle: string;
  company: string;
  offers: string;
  seeking: string;
  phone: string;
  email: string;
};

export type NetworkingJoinFieldVisibility = {
  showJobTitle: boolean;
  showCompany: boolean;
  /** «Компания» | «Номер аптеки» */
  companyLabel: string;
  companyRequired: boolean;
  showOffers: boolean;
  offersRequired: boolean;
  showSeeking: boolean;
  seekingRequired: boolean;
  showPhone: boolean;
  phoneRequired: boolean;
  showEmail: boolean;
  emailRequired: boolean;
  offersLabel: string;
  seekingLabel: string;
  /** Плейсхолдер; если пуст — на клиенте можно взять label. */
  offersPlaceholder: string;
  seekingPlaceholder: string;
};

const HIDDEN_CONTACT_VISIBILITY: Pick<
  NetworkingJoinFieldVisibility,
  "showPhone" | "phoneRequired" | "showEmail" | "emailRequired"
> = {
  showPhone: false,
  phoneRequired: false,
  showEmail: false,
  emailRequired: false,
};

/** Единые правила видимости полей join/profile по режиму формы. */
export function getNetworkingJoinFieldVisibility(
  mode: NetworkingJoinFormMode,
  fields: NetworkingJoinFormFields = DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
  copy: NetworkingJoinFormCopy = DEFAULT_NETWORKING_JOIN_FORM_COPY,
): NetworkingJoinFieldVisibility {
  const normalizedFields = normalizeNetworkingJoinFormFields(fields);
  const normalizedCopy = normalizeNetworkingJoinFormCopy(copy);
  if (mode === "pharma") {
    return {
      showJobTitle: true,
      showCompany: true,
      companyLabel: "Номер аптеки",
      companyRequired: false,
      showOffers: false,
      offersRequired: false,
      showSeeking: false,
      seekingRequired: false,
      ...HIDDEN_CONTACT_VISIBILITY,
      offersLabel: normalizedCopy.offersLabel,
      seekingLabel: normalizedCopy.seekingLabel,
      offersPlaceholder: normalizedCopy.offersPlaceholder,
      seekingPlaceholder: normalizedCopy.seekingPlaceholder,
    };
  }
  if (mode === "networking") {
    return {
      showJobTitle: false,
      showCompany: normalizedFields.company,
      companyLabel: "Компания",
      companyRequired: normalizedFields.companyRequired,
      showOffers: normalizedFields.offers,
      offersRequired: normalizedFields.offersRequired,
      showSeeking: normalizedFields.seeking,
      seekingRequired: normalizedFields.seekingRequired,
      showPhone: normalizedFields.phone,
      phoneRequired: normalizedFields.phoneRequired,
      showEmail: normalizedFields.email,
      emailRequired: normalizedFields.emailRequired,
      offersLabel: normalizedCopy.offersLabel,
      seekingLabel: normalizedCopy.seekingLabel,
      offersPlaceholder: normalizedCopy.offersPlaceholder,
      seekingPlaceholder: normalizedCopy.seekingPlaceholder,
    };
  }
  return {
    showJobTitle: false,
    showCompany: false,
    companyLabel: "Компания",
    companyRequired: false,
    showOffers: false,
    offersRequired: false,
    showSeeking: false,
    seekingRequired: false,
    ...HIDDEN_CONTACT_VISIBILITY,
    offersLabel: normalizedCopy.offersLabel,
    seekingLabel: normalizedCopy.seekingLabel,
    offersPlaceholder: normalizedCopy.offersPlaceholder,
    seekingPlaceholder: normalizedCopy.seekingPlaceholder,
  };
}

/** Placeholder для input: своя фраза или название поля; для обязательных — « *». */
export function networkingJoinFieldPlaceholder(
  label: string,
  placeholder: string | undefined,
  required = false,
): string {
  const custom = typeof placeholder === "string" ? placeholder.trim() : "";
  const base = custom || label;
  return required ? `${base} *` : base;
}

const NETWORKING_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Почта: простой практичный формат local@domain.tld */
export function isValidNetworkingEmail(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > 120) return false;
  return NETWORKING_EMAIL_RE.test(value);
}

/**
 * Телефон: цифры с опциональным +, пробелами, -, ().
 * После очистки — от 10 до 15 цифр (как E.164 без «+»).
 */
export function isValidNetworkingPhone(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > 40) return false;
  if (!/^\+?[\d\s()-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** Ошибка валидации join-формы; null — ок. ФИО всегда обязательно. */
export function validateNetworkingJoinDraft(
  mode: NetworkingJoinFormMode,
  fields: NetworkingJoinFormFields,
  values: NetworkingProfileTextFields,
): string | null {
  if (!values.fullName.trim()) return "Укажите ФИО";
  if (mode !== "networking") return null;
  const visibility = getNetworkingJoinFieldVisibility(mode, fields);
  if (visibility.showCompany && visibility.companyRequired && !values.company.trim()) {
    return `Укажите ${visibility.companyLabel}`;
  }
  if (visibility.showOffers && visibility.offersRequired && !values.offers.trim()) {
    return `Укажите ${visibility.offersLabel}`;
  }
  if (visibility.showSeeking && visibility.seekingRequired && !values.seeking.trim()) {
    return `Укажите ${visibility.seekingLabel}`;
  }
  if (visibility.showPhone) {
    const phone = values.phone.trim();
    if (visibility.phoneRequired && !phone) return "Укажите телефон";
    if (phone && !isValidNetworkingPhone(phone)) return "Некорректный телефон";
  }
  if (visibility.showEmail) {
    const email = values.email.trim();
    if (visibility.emailRequired && !email) return "Укажите почту";
    if (email && !isValidNetworkingEmail(email)) return "Некорректная почта";
  }
  return null;
}

/** Нужна ли расширенная форма входа (не ник + random). */
export function usesExtendedNetworkingJoinForm(
  networkingEnabled: boolean,
  mode: NetworkingJoinFormMode,
): boolean {
  return networkingEnabled && (mode === "networking" || mode === "pharma");
}

/** Нижние вкладки плеера нетворкинга. */
export type NetworkingPlayerTab = "feed" | "guests" | "chats";

export const DEFAULT_NETWORKING_PLAYER_TAB: NetworkingPlayerTab = "feed";

export function normalizeNetworkingPlayerTab(raw: unknown): NetworkingPlayerTab {
  if (raw === "feed" || raw === "guests" || raw === "chats") return raw;
  return DEFAULT_NETWORKING_PLAYER_TAB;
}

/** Строка идентичности гостя: имя · должность · компания. */
export function formatNetworkingGuestIdentity(guest: {
  fullName?: string | null;
  nickname?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}): string {
  const name = (guest.fullName ?? "").trim() || (guest.nickname ?? "").trim();
  return [name, (guest.jobTitle ?? "").trim(), (guest.company ?? "").trim()]
    .filter(Boolean)
    .join(" · ");
}
