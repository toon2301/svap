export type DesktopSettingsSection =
  | 'edit-profile'
  | 'notifications'
  | 'offer-watches'
  | 'account-type'
  | 'privacy'
  | 'language'
  | 'blocked-users'
  | 'account-settings';

export interface DesktopSettingsReturnTarget {
  moduleId: string;
  url: string;
}

interface DesktopSettingsHistoryMarker {
  version: 1;
  returnTarget: DesktopSettingsReturnTarget;
}

interface DesktopSettingsOriginHistoryMarker {
  version: 1;
  returnTarget: DesktopSettingsReturnTarget;
}

type HistoryStateRecord = Record<string, unknown>;

const HISTORY_KEY = '__svaplyDesktopSettings';
const ORIGIN_HISTORY_KEY = '__svaplyDesktopSettingsOrigin';

const RETURNABLE_MODULES = new Set([
  'home',
  'statistics',
  'profile',
  'user-profile',
  'portfolio-detail',
  'portfolio-create',
  'favorites',
  'messages',
  'requests',
  'skills',
  'skills-offer',
  'skills-search',
  'skills-select-category',
  'skills-describe',
  'skills-add-custom-category',
  'offer-reviews',
  'create',
]);

const SECTION_PATHS: Record<DesktopSettingsSection, string> = {
  'edit-profile': '/dashboard/settings',
  notifications: '/dashboard/settings/notifications',
  'offer-watches': '/dashboard/settings/watches',
  'account-type': '/dashboard/account-type',
  privacy: '/dashboard/privacy',
  language: '/dashboard/language',
  'blocked-users': '/dashboard/settings/blocked',
  'account-settings': '/dashboard/settings/account',
};

const MODULE_SECTIONS: Partial<Record<string, DesktopSettingsSection>> = {
  settings: 'edit-profile',
  'notification-settings': 'notifications',
  'account-type': 'account-type',
  privacy: 'privacy',
  language: 'language',
  'blocked-users': 'blocked-users',
  'account-settings': 'account-settings',
};

function asHistoryStateRecord(value: unknown): HistoryStateRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as HistoryStateRecord)
    : {};
}

export function normalizeDashboardUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/dashboard')) return null;

  try {
    const parsed = new URL(value, 'https://swaply.local');
    if (parsed.origin !== 'https://swaply.local') return null;
    if (parsed.pathname !== '/dashboard' && !parsed.pathname.startsWith('/dashboard/')) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function createDesktopSettingsReturnTarget(
  moduleId: string,
  currentUrl: string,
): DesktopSettingsReturnTarget | null {
  if (!RETURNABLE_MODULES.has(moduleId)) return null;

  const normalizedUrl = normalizeDashboardUrl(currentUrl);
  if (!normalizedUrl) return null;

  const parsed = new URL(normalizedUrl, 'https://swaply.local');
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  let resolvedModuleId = moduleId;

  // Vnorená route je presnejší zdroj než krátko oneskorený React state. Toto
  // okno vzniká najmä pri client-side prechode na detail portfólia a okamžitom
  // otvorení Nastavení.
  if (/^\/dashboard\/users\/[^/]+\/portfolio\/\d+$/.test(path)) {
    resolvedModuleId = 'portfolio-detail';
  } else if (/^\/dashboard\/users\/[^/]+\/portfolio\/create$/.test(path)) {
    resolvedModuleId = 'portfolio-create';
  } else if (path === '/dashboard/skills/offer') {
    resolvedModuleId = 'skills-offer';
  } else if (path === '/dashboard/skills/search') {
    resolvedModuleId = 'skills-search';
  } else if (path === '/dashboard/skills') {
    resolvedModuleId = 'skills';
  }

  // Starší flow zobrazoval výber Ponúkam/Hľadám pod všeobecnou adresou
  // `/dashboard`. Pred uložením návratu mu priraď kanonickú route, aby browser
  // Back nemohol tú istú adresu vyhodnotiť ako Nástenku.
  const url = resolvedModuleId === 'skills' && path === '/dashboard'
    ? `/dashboard/skills${parsed.search}${parsed.hash}`
    : normalizedUrl;

  return { moduleId: resolvedModuleId, url };
}

export function isDesktopSettingsReturnTarget(
  value: unknown,
): value is DesktopSettingsReturnTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const candidate = value as Partial<DesktopSettingsReturnTarget>;
  return (
    typeof candidate.moduleId === 'string' &&
    RETURNABLE_MODULES.has(candidate.moduleId) &&
    normalizeDashboardUrl(candidate.url) === candidate.url
  );
}

export function withDesktopSettingsHistory(
  historyState: unknown,
  returnTarget: DesktopSettingsReturnTarget,
): HistoryStateRecord {
  const nextState = withoutDesktopSettingsOriginHistory(historyState);
  return {
    ...nextState,
    [HISTORY_KEY]: {
      version: 1,
      returnTarget,
    } satisfies DesktopSettingsHistoryMarker,
  };
}

/** Označí pôvodný history záznam presným vnoreným stavom pred otvorením Nastavení. */
export function withDesktopSettingsOriginHistory(
  historyState: unknown,
  returnTarget: DesktopSettingsReturnTarget,
): HistoryStateRecord {
  return {
    ...asHistoryStateRecord(historyState),
    [ORIGIN_HISTORY_KEY]: {
      version: 1,
      returnTarget,
    } satisfies DesktopSettingsOriginHistoryMarker,
  };
}

/** Odstráni interný marker pôvodu bez zásahu do Next.js history údajov. */
export function withoutDesktopSettingsOriginHistory(
  historyState: unknown,
): HistoryStateRecord {
  const nextState = { ...asHistoryStateRecord(historyState) };
  delete nextState[ORIGIN_HISTORY_KEY];
  return nextState;
}

export function withoutDesktopSettingsHistory(historyState: unknown): HistoryStateRecord {
  const nextState = { ...asHistoryStateRecord(historyState) };
  delete nextState[HISTORY_KEY];
  return nextState;
}

export function readDesktopSettingsReturnTarget(
  historyState: unknown,
): DesktopSettingsReturnTarget | null {
  const marker = asHistoryStateRecord(historyState)[HISTORY_KEY];
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return null;

  const candidate = marker as Partial<DesktopSettingsHistoryMarker>;
  if (candidate.version !== 1 || !isDesktopSettingsReturnTarget(candidate.returnTarget)) {
    return null;
  }

  return candidate.returnTarget;
}

/** Načíta validovaný vnorený cieľ uložený na pôvodnom history zázname. */
export function readDesktopSettingsOriginTarget(
  historyState: unknown,
): DesktopSettingsReturnTarget | null {
  const marker = asHistoryStateRecord(historyState)[ORIGIN_HISTORY_KEY];
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return null;

  const candidate = marker as Partial<DesktopSettingsOriginHistoryMarker>;
  if (candidate.version !== 1 || !isDesktopSettingsReturnTarget(candidate.returnTarget)) {
    return null;
  }

  return candidate.returnTarget;
}

export function getDesktopSettingsSectionPath(section: string): string | null {
  // Object.hasOwn: nečítať zdedené properties (toString/constructor/valueOf…).
  return Object.hasOwn(SECTION_PATHS, section)
    ? SECTION_PATHS[section as DesktopSettingsSection]
    : null;
}

export function getDesktopSettingsSectionFromModule(
  moduleId: string | null | undefined,
): DesktopSettingsSection | null {
  if (!moduleId || !Object.hasOwn(MODULE_SECTIONS, moduleId)) return null;
  return MODULE_SECTIONS[moduleId] ?? null;
}

export function getDesktopSettingsSectionFromPath(
  pathname: string,
): DesktopSettingsSection | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const entry = Object.entries(SECTION_PATHS).find(([, path]) => path === normalizedPath);
  return (entry?.[0] as DesktopSettingsSection | undefined) ?? null;
}
