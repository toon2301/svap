import { dashboardSectionPath } from '../components/dashboardRoutes';

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
  depth?: number;
}

interface DesktopSettingsOriginHistoryMarker {
  version: 1;
  returnTarget: DesktopSettingsReturnTarget;
}

type HistoryStateRecord = Record<string, unknown>;

const HISTORY_KEY = '__svaplyDesktopSettings';
const ORIGIN_HISTORY_KEY = '__svaplyDesktopSettingsOrigin';

// Hlbšie sa kroky nesledujú: neznáma hĺbka znamená jeden krok späť ako doteraz.
const MAX_TRACKED_DEPTH = 40;

const RETURNABLE_MODULES = new Set([
  'home',
  'statistics',
  'profile',
  'user-profile',
  'portfolio-detail',
  'portfolio-create',
  'favorites',
  'watches',
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

/**
 * Čo ktorá sekcia Nastavení znamená ako adresa – povedané modulom, nie cestou.
 *
 * Samotné cesty sa berú z `DASHBOARD_ROUTES`, takže sekcia a stránka, ktorá ju
 * zobrazuje, nemôžu mať dve rôzne adresy. „Sledované ponuky" nie sú vlastný
 * modul: je to pravá sekcia Nastavení, preto dvojica.
 */
const SECTION_TARGETS: Record<
  DesktopSettingsSection,
  { moduleId: string; rightItem?: string }
> = {
  'edit-profile': { moduleId: 'settings' },
  notifications: { moduleId: 'notification-settings' },
  'offer-watches': { moduleId: 'settings', rightItem: 'offer-watches' },
  'account-type': { moduleId: 'account-type' },
  privacy: { moduleId: 'privacy' },
  language: { moduleId: 'language' },
  'blocked-users': { moduleId: 'blocked-users' },
  'account-settings': { moduleId: 'account-settings' },
};

const SETTINGS_SECTIONS = Object.keys(SECTION_TARGETS) as DesktopSettingsSection[];

function sectionPath(section: DesktopSettingsSection): string | null {
  const target = SECTION_TARGETS[section];
  return dashboardSectionPath(target.moduleId, target.rightItem ?? null);
}

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

function normalizeDepth(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_TRACKED_DEPTH
    ? value
    : null;
}

function createHistoryMarker(
  returnTarget: DesktopSettingsReturnTarget,
  depth?: number | null,
): DesktopSettingsHistoryMarker {
  const normalizedDepth = normalizeDepth(depth);
  return normalizedDepth === null
    ? { version: 1, returnTarget }
    : { version: 1, returnTarget, depth: normalizedDepth };
}

export function withDesktopSettingsHistory(
  historyState: unknown,
  returnTarget: DesktopSettingsReturnTarget,
  depth?: number,
): HistoryStateRecord {
  const nextState = withoutDesktopSettingsOriginHistory(historyState);
  return {
    ...nextState,
    [HISTORY_KEY]: createHistoryMarker(returnTarget, depth),
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

/** Koľko záznamov histórie leží medzi aktuálnym a prvou obrazovkou Nastavení; `null` = neznáme. */
export function readDesktopSettingsDepth(historyState: unknown): number | null {
  if (!readDesktopSettingsReturnTarget(historyState)) return null;

  const marker = asHistoryStateRecord(historyState)[HISTORY_KEY] as Partial<DesktopSettingsHistoryMarker>;
  return normalizeDepth(marker.depth);
}

/** O koľko krokov späť leží pôvod Nastavení; pri neznámej hĺbke jeden krok ako doteraz. */
export function getDesktopSettingsStepsToOrigin(historyState: unknown): number {
  const depth = readDesktopSettingsDepth(historyState);
  return depth === null ? 1 : depth + 1;
}

/** Stav pre nový záznam, ktorý kopíruje aktuálny (vrátane Next.js údajov) o krok hlbšie. */
export function withDesktopSettingsStep(historyState: unknown): unknown {
  const returnTarget = readDesktopSettingsReturnTarget(historyState);
  const depth = readDesktopSettingsDepth(historyState);
  if (!returnTarget || depth === null) return historyState;

  return withDesktopSettingsHistory(historyState, returnTarget, depth + 1);
}

/** Stav pre nový záznam, ktorý doteraz nenášal nič: len marker o krok hlbšie, inak `null`. */
export function createDesktopSettingsStepState(historyState: unknown): HistoryStateRecord | null {
  const returnTarget = readDesktopSettingsReturnTarget(historyState);
  const depth = readDesktopSettingsDepth(historyState);
  if (!returnTarget || depth === null || normalizeDepth(depth + 1) === null) return null;

  return { [HISTORY_KEY]: createHistoryMarker(returnTarget, depth + 1) };
}

/** Stav pre záznam „Upraviť profil": pokračuje v rozbehnutej session, alebo ju začne na vlastnom profile. */
export function createProfileEditHistoryState(
  historyState: unknown,
  currentUrl: string,
  ownProfilePath: string,
): HistoryStateRecord | null {
  if (readDesktopSettingsReturnTarget(historyState)) {
    return createDesktopSettingsStepState(historyState);
  }

  const normalizedUrl = normalizeDashboardUrl(currentUrl);
  if (!normalizedUrl) return null;

  const { pathname } = new URL(normalizedUrl, 'https://swaply.local');
  if (pathname.replace(/\/+$/, '') !== ownProfilePath) return null;

  const returnTarget = createDesktopSettingsReturnTarget('profile', currentUrl);
  return returnTarget ? { [HISTORY_KEY]: createHistoryMarker(returnTarget, 0) } : null;
}

/** Stav pre záznam „Sledované ponuky" mimo modulu Nastavení: zachová pôvod rozbehnutej session. */
export function createOfferWatchesSettingsHistoryState(
  historyState: unknown,
  fallbackTarget: DesktopSettingsReturnTarget,
): HistoryStateRecord {
  const returnTarget = readDesktopSettingsReturnTarget(historyState);
  const depth = readDesktopSettingsDepth(historyState);
  if (returnTarget && depth !== null) {
    return withDesktopSettingsHistory(historyState, returnTarget, depth + 1);
  }

  return withDesktopSettingsHistory(historyState, fallbackTarget);
}

/** Šípky v Nastaveniach volajú handler priamo z `onClick`, takže namiesto používateľa príde udalosť kliku; tú zahoď. */
export function normalizeSettingsTargetUser<T extends { id?: number; slug?: string | null }>(
  value: T | null | undefined,
): T | null {
  if (typeof value !== 'object' || value === null) return null;
  return typeof value.id === 'number' || typeof value.slug === 'string' ? value : null;
}

export function getDesktopSettingsSectionPath(section: string): string | null {
  // Object.hasOwn: nečítať zdedené properties (toString/constructor/valueOf…).
  return Object.hasOwn(SECTION_TARGETS, section)
    ? sectionPath(section as DesktopSettingsSection)
    : null;
}

export function getDesktopSettingsSectionFromModule(
  moduleId: string | null | undefined,
): DesktopSettingsSection | null {
  if (!moduleId || !Object.hasOwn(MODULE_SECTIONS, moduleId)) return null;
  return MODULE_SECTIONS[moduleId] ?? null;
}

/**
 * Je tento modul SEKCIOU Nastavení (nie ich zoznamom)?
 *
 * Jediný zdroj pre miesta, ktoré sa pýtajú „sme vnútri Nastavení" – napríklad
 * mobilná lišta, ktorá podľa toho ukazuje šípku späť. Nová sekcia sa tak
 * nemusí dopisovať do ďalšieho ručného zoznamu.
 */
export function isSettingsSectionModule(moduleId: string | null | undefined): boolean {
  return moduleId !== 'settings' && getDesktopSettingsSectionFromModule(moduleId) !== null;
}

export function getDesktopSettingsSectionFromPath(
  pathname: string,
): DesktopSettingsSection | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return SETTINGS_SECTIONS.find((section) => sectionPath(section) === normalizedPath) ?? null;
}
