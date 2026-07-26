export type DesktopSettingsSection =
  | 'edit-profile'
  | 'notifications'
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

type HistoryStateRecord = Record<string, unknown>;

const HISTORY_KEY = '__svaplyDesktopSettings';

const RETURNABLE_MODULES = new Set([
  'home',
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

  const url = normalizeDashboardUrl(currentUrl);
  return url ? { moduleId, url } : null;
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
  return {
    ...asHistoryStateRecord(historyState),
    [HISTORY_KEY]: {
      version: 1,
      returnTarget,
    } satisfies DesktopSettingsHistoryMarker,
  };
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

export function getDesktopSettingsSectionPath(section: string): string | null {
  return section in SECTION_PATHS
    ? SECTION_PATHS[section as DesktopSettingsSection]
    : null;
}

export function getDesktopSettingsSectionFromModule(
  moduleId: string | null | undefined,
): DesktopSettingsSection | null {
  return moduleId ? MODULE_SECTIONS[moduleId] ?? null : null;
}

export function getDesktopSettingsSectionFromPath(
  pathname: string,
): DesktopSettingsSection | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const entry = Object.entries(SECTION_PATHS).find(([, path]) => path === normalizedPath);
  return (entry?.[0] as DesktopSettingsSection | undefined) ?? null;
}
