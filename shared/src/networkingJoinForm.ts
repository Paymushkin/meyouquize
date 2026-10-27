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
};

/** Единые правила видимости полей join/profile по режиму формы. */
export function getNetworkingJoinFieldVisibility(
  mode: NetworkingJoinFormMode,
  fields: NetworkingJoinFormFields = DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
): NetworkingJoinFieldVisibility {
  if (mode === "pharma") {
    return {
      showJobTitle: true,
      showCompany: true,
      companyLabel: "Номер аптеки",
      showOffers: false,
      showSeeking: false,
    };
  }
  if (mode === "networking") {
    return {
      showJobTitle: false,
      showCompany: fields.company,
      companyLabel: "Компания",
      showOffers: fields.offers,
      showSeeking: fields.seeking,
    };
  }
  return {
    showJobTitle: false,
    showCompany: false,
    companyLabel: "Компания",
    showOffers: false,
    showSeeking: false,
  };
}

/** Нужна ли расширенная форма входа (не ник + random). */
export function usesExtendedNetworkingJoinForm(
  networkingEnabled: boolean,
  mode: NetworkingJoinFormMode,
): boolean {
  return networkingEnabled && (mode === "networking" || mode === "pharma");
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
