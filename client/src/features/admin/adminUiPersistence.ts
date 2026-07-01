export type AdminSection =
  | "general"
  | "questions"
  | "speakers"
  | "banners"
  | "branding"
  | "report"
  | "results"
  | "danger";

export const ADMIN_SECTION_IDS: AdminSection[] = [
  "general",
  "questions",
  "speakers",
  "banners",
  "branding",
  "report",
  "results",
  "danger",
];

export type RoomQuestionsTab = "quizzes" | "votes" | "reactions" | "feedback" | "randomizer";

export type BannersEditorTab = "banner" | "speaker" | "program";

const ROOM_QUESTIONS_TABS: RoomQuestionsTab[] = [
  "quizzes",
  "votes",
  "reactions",
  "feedback",
  "randomizer",
];

const BANNERS_EDITOR_TABS: BannersEditorTab[] = ["banner", "speaker", "program"];

const ADMIN_SECTION_ID_SET = new Set<string>(ADMIN_SECTION_IDS);

const STORAGE_V1_PREFIX = "mq_admin_ui_v1_";
const LEGACY_SECTION_PREFIX = "mq_admin_section_";
const LEGACY_QUESTIONS_TAB_PREFIX = "mq_admin_room_questions_tab_";

type StoredV1 = {
  section?: string;
  tabs?: {
    questions?: string;
    banners?: string;
    resultsSubQuizId?: string;
  };
};

export type AdminUiPersistence = {
  section: AdminSection;
  questionsTab: RoomQuestionsTab;
  bannersTab: BannersEditorTab;
  resultsSubQuizId: string;
};

const DEFAULTS: AdminUiPersistence = {
  section: "questions",
  questionsTab: "quizzes",
  bannersTab: "banner",
  resultsSubQuizId: "",
};

function storageKey(eventName: string): string {
  return `${STORAGE_V1_PREFIX}${eventName}`;
}

function parseSection(raw: string | undefined): AdminSection {
  if (raw && ADMIN_SECTION_ID_SET.has(raw)) return raw as AdminSection;
  return DEFAULTS.section;
}

function parseQuestionsTab(raw: string | undefined): RoomQuestionsTab {
  if (raw && ROOM_QUESTIONS_TABS.includes(raw as RoomQuestionsTab)) {
    return raw as RoomQuestionsTab;
  }
  return DEFAULTS.questionsTab;
}

function parseBannersTab(raw: string | undefined): BannersEditorTab {
  if (raw && BANNERS_EDITOR_TABS.includes(raw as BannersEditorTab)) {
    return raw as BannersEditorTab;
  }
  return DEFAULTS.bannersTab;
}

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  return null;
}

function readLegacy(eventName: string): Partial<AdminUiPersistence> {
  if (!eventName) return {};
  const storage = getLocalStorage();
  if (!storage) return {};
  const out: Partial<AdminUiPersistence> = {};
  try {
    const section = storage.getItem(`${LEGACY_SECTION_PREFIX}${eventName}`);
    if (section) out.section = parseSection(section);
    const questionsTab = storage.getItem(`${LEGACY_QUESTIONS_TAB_PREFIX}${eventName}`);
    if (questionsTab) out.questionsTab = parseQuestionsTab(questionsTab);
  } catch {
    // ignore storage errors in private mode
  }
  return out;
}

function readStoredV1(eventName: string): StoredV1 {
  if (!eventName) return {};
  const storage = getLocalStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(storageKey(eventName));
    if (!raw) return {};
    return JSON.parse(raw) as StoredV1;
  } catch {
    return {};
  }
}

function writeStoredV1(eventName: string, patch: StoredV1): void {
  if (!eventName) return;
  const storage = getLocalStorage();
  if (!storage) return;
  const current = readStoredV1(eventName);
  const next: StoredV1 = {
    section: patch.section ?? current.section,
    tabs: { ...current.tabs, ...patch.tabs },
  };
  try {
    storage.setItem(storageKey(eventName), JSON.stringify(next));
  } catch {
    // ignore storage errors in private mode
  }
}

export function readAdminUiPersistence(eventName: string): AdminUiPersistence {
  const legacy = readLegacy(eventName);
  if (!eventName) {
    return { ...DEFAULTS, ...legacy };
  }
  const stored = readStoredV1(eventName);
  return {
    section: parseSection(stored.section ?? legacy.section),
    questionsTab: parseQuestionsTab(stored.tabs?.questions ?? legacy.questionsTab),
    bannersTab: parseBannersTab(stored.tabs?.banners),
    resultsSubQuizId:
      typeof stored.tabs?.resultsSubQuizId === "string" ? stored.tabs.resultsSubQuizId : "",
  };
}

export function writeAdminUiSection(eventName: string, section: AdminSection): void {
  writeStoredV1(eventName, { section });
}

export function writeAdminUiQuestionsTab(eventName: string, tab: RoomQuestionsTab): void {
  writeStoredV1(eventName, { tabs: { questions: tab } });
}

export function writeAdminUiBannersTab(eventName: string, tab: BannersEditorTab): void {
  writeStoredV1(eventName, { tabs: { banners: tab } });
}

export function writeAdminUiResultsSubQuizId(eventName: string, subQuizId: string): void {
  writeStoredV1(eventName, { tabs: { resultsSubQuizId: subQuizId } });
}
