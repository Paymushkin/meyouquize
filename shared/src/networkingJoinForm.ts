/** Форма входа при включённом нетворкинге. */
export type NetworkingJoinFormMode = "interactive" | "networking" | "pharma";

/** Опциональные поля большой формы нетворкинга (ФИО всегда). */
export type NetworkingJoinFormFields = {
  company: boolean;
  offers: boolean;
  seeking: boolean;
};

export const DEFAULT_NETWORKING_JOIN_FORM_FIELDS: NetworkingJoinFormFields = {
  company: true,
  offers: true,
  seeking: true,
};

/** Подписи и плейсхолдеры полей «полезен» / «ищу» (режим networking). */
export type NetworkingJoinFormCopy = {
  offersLabel: string;
  seekingLabel: string;
  offersPlaceholder: string;
  seekingPlaceholder: string;
};

export const DEFAULT_NETWORKING_JOIN_FORM_COPY: NetworkingJoinFormCopy = {
  offersLabel: "Чем полезен",
  seekingLabel: "Что ищу",
  offersPlaceholder: "",
  seekingPlaceholder: "",
};

const LABEL_MAX = 60;
const PLACEHOLDER_MAX = 160;

function sanitizeJoinFormLabel(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const next = raw.trim().slice(0, LABEL_MAX);
  return next || fallback;
}

function sanitizeJoinFormPlaceholder(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PLACEHOLDER_MAX);
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
  };
}

export function normalizeNetworkingJoinFormMode(raw: unknown): NetworkingJoinFormMode {
  if (raw === "interactive" || raw === "networking" || raw === "pharma") return raw;
  if (raw === "simple") return "interactive";
  if (raw === "full") return "networking";
  return "interactive";
}

export function normalizeNetworkingJoinFormFields(raw: unknown): NetworkingJoinFormFields {
  const src =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  return {
    company:
      typeof src.company === "boolean" ? src.company : DEFAULT_NETWORKING_JOIN_FORM_FIELDS.company,
    offers:
      typeof src.offers === "boolean" ? src.offers : DEFAULT_NETWORKING_JOIN_FORM_FIELDS.offers,
    seeking:
      typeof src.seeking === "boolean" ? src.seeking : DEFAULT_NETWORKING_JOIN_FORM_FIELDS.seeking,
  };
}

/** Текстовые поля профиля (join + «Мой профиль»). */
export type NetworkingProfileTextFields = {
  fullName: string;
  jobTitle: string;
  company: string;
  offers: string;
  seeking: string;
};

export type NetworkingJoinFieldVisibility = {
  showJobTitle: boolean;
  showCompany: boolean;
  /** «Компания» | «Номер аптеки» */
  companyLabel: string;
  showOffers: boolean;
  showSeeking: boolean;
  offersLabel: string;
  seekingLabel: string;
  /** Плейсхолдер; если пуст — на клиенте можно взять label. */
  offersPlaceholder: string;
  seekingPlaceholder: string;
};

/** Единые правила видимости полей join/profile по режиму формы. */
export function getNetworkingJoinFieldVisibility(
  mode: NetworkingJoinFormMode,
  fields: NetworkingJoinFormFields = DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
  copy: NetworkingJoinFormCopy = DEFAULT_NETWORKING_JOIN_FORM_COPY,
): NetworkingJoinFieldVisibility {
  const normalizedCopy = normalizeNetworkingJoinFormCopy(copy);
  if (mode === "pharma") {
    return {
      showJobTitle: true,
      showCompany: true,
      companyLabel: "Номер аптеки",
      showOffers: false,
      showSeeking: false,
      offersLabel: normalizedCopy.offersLabel,
      seekingLabel: normalizedCopy.seekingLabel,
      offersPlaceholder: normalizedCopy.offersPlaceholder,
      seekingPlaceholder: normalizedCopy.seekingPlaceholder,
    };
  }
  if (mode === "networking") {
    return {
      showJobTitle: false,
      showCompany: fields.company,
      companyLabel: "Компания",
      showOffers: fields.offers,
      showSeeking: fields.seeking,
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
    showOffers: false,
    showSeeking: false,
    offersLabel: normalizedCopy.offersLabel,
    seekingLabel: normalizedCopy.seekingLabel,
    offersPlaceholder: normalizedCopy.offersPlaceholder,
    seekingPlaceholder: normalizedCopy.seekingPlaceholder,
  };
}

/** Placeholder для input: своя фраза или название поля. */
export function networkingJoinFieldPlaceholder(
  label: string,
  placeholder: string | undefined,
): string {
  const custom = typeof placeholder === "string" ? placeholder.trim() : "";
  return custom || label;
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
