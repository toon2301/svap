/**
 * Zapisovači histórie a tabuľka `DASHBOARD_ROUTES` sa nesmú rozísť.
 *
 * Kolo 1 zjednotilo ČÍTANIE adresy (mount aj krok späť). Zapisovanie ostalo
 * roztrúsené po vlastných reťazcoch a presne tak vznikol pôvodný rozchod:
 * stránka pribudla, zoznam adries o nej nevedel a po kroku späť sa zobrazil
 * modul predošlej obrazovky. Test hľadá adresu `/dashboard` napísanú priamo v
 * argumente zápisu do histórie a drží dve rôzne latky:
 *
 *  - CELÁ appka: adresu, ktorú niekto zapíše, musí tabuľka vedieť prečítať.
 *    To je tá vlastnosť, na ktorej záleží – zapísať adresu, ktorú čítanie
 *    nepozná, znamená modul predošlej obrazovky po kroku späť.
 *  - DASHBOARD: tu sa adresa nemá písať vôbec, skladá sa z tabuľky.
 *
 * Zápis LEN do query (`?highlight=`, `?offer=`, `?tab=`) výnimku má: query je
 * stav jednej stránky, tabuľka hovorí o ceste.
 */

import fs from 'fs';
import path from 'path';
import {
  DASHBOARD_ROUTES,
  dashboardProfilePath,
  dashboardSectionPath,
  matchDashboardRoute,
} from './dashboardRoutes';

const SRC_DIR = path.join(process.cwd(), 'src');

/** Volania, ktorými sa mení adresa v prehliadači. */
const WRITER_CALLS = /\b(?:pushState|replaceState|router\.(?:push|replace))\s*\(/g;

/** Kde sa adresa nemá písať priamo, ale skladať z tabuľky. */
const TABLE_DRIVEN_PREFIX = 'components/dashboard/';

/**
 * Súbory, ktoré zatiaľ zapisujú vlastné adresy.
 *
 * `useDashboardState.ts` je pod ochranou (nemeniť) – vetvy `handleRightItemClick`
 * pre Upozornenia, Jazyk, Typ účtu, Súkromie, Účet a Blokovaných v ňom píšu tie
 * isté adresy, aké má tabuľka, ale vlastnými reťazcami. Previazanie čaká na
 * výslovnú výnimku pre ten súbor; dovtedy je to tu priznané, nie skryté.
 * Spodnú latku (adresu pozná tabuľka) spĺňa aj tak – drží ju test nižšie.
 */
const KNOWN_UNWIRED = new Set(['components/dashboard/hooks/useDashboardState.ts']);

/**
 * Adresa zo zdrojáku na tvar, ktorý sa dá porovnať s tabuľkou: query aj
 * fragment preč, dosadené hodnoty za `${…}`. Skúšajú sa obe podoby parametra
 * (slug aj číslo), lebo z textu sa nedá zistiť, ktorá tam príde.
 */
function candidatePaths(literal: string): string[] {
  const pathOnly = literal.split('?')[0].split('#')[0];
  return ['jana', '7'].map((sample) => pathOnly.replace(/\$\{[^}]*\}/g, sample));
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      found.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Zdroják bez komentárov – tie sa nevykonávajú.
 *
 * Bez toho by test hlásil aj `router.push('/dashboard')` citovaný vo
 * vysvetľujúcom komentári (napr. prečo sa tam NEPOUŽÍVA).
 */
function withoutComments(source: string): string {
  let out = '';
  let quote: string | null = null;
  let comment: 'line' | 'block' | null = null;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (comment === 'line') {
      if (char === '\n') { comment = null; out += char; }
      continue;
    }
    if (comment === 'block') {
      if (char === '*' && next === '/') { comment = null; i += 1; }
      continue;
    }
    if (quote) {
      if (char === '\\') { out += char + (next ?? ''); i += 1; continue; }
      if (char === quote) quote = null;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') { comment = 'line'; i += 1; continue; }
    if (char === '/' && next === '*') { comment = 'block'; i += 1; continue; }
    if (char === "'" || char === '"' || char === '`') quote = char;
    out += char;
  }

  return out;
}

/** Text argumentov volania, ktoré sa začína na `from` (za otváracou zátvorkou). */
function callArguments(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(from + 1, i);
    }
  }
  return source.slice(from);
}

/** Adresa `/dashboard…` napísaná priamo v texte (v úvodzovkách alebo šablóne). */
const LITERAL_PATH = /['"`]\/dashboard[^'"`]*/g;

function writerViolations(rawSource: string): string[] {
  const source = withoutComments(rawSource);
  const found: string[] = [];
  for (const match of source.matchAll(WRITER_CALLS)) {
    const args = callArguments(source, match.index + match[0].length - 1);
    for (const literal of args.matchAll(LITERAL_PATH)) {
      found.push(literal[0].slice(1));
    }
  }
  return found;
}

type Writer = { file: string; literal: string };

function allWriters(files: string[]): Writer[] {
  const writers: Writer[] = [];
  for (const file of files) {
    const relative = path.relative(SRC_DIR, file).split(path.sep).join('/');
    for (const literal of writerViolations(fs.readFileSync(file, 'utf8'))) {
      writers.push({ file: relative, literal });
    }
  }
  return writers;
}

describe('zapisovači histórie a tabuľka', () => {
  const files = sourceFiles(SRC_DIR);
  const writers = allWriters(files);

  it('nájde zdrojáky aj zapisovačov, v ktorých má hľadať', () => {
    // Kanárik proti pokazenému skeneru: keby prestal čokoľvek nachádzať,
    // všetky tvrdenia nižšie by ticho prešli.
    //
    // Počet zapisovačov zámerne klesá – každé kolo ich časť prejde na zdieľané
    // funkcie (naposledy osem vstupov do cudzieho profilu na
    // `openUserProfileFromSearch`). Hranica je preto nízka a stráži „nula",
    // nie konkrétne číslo.
    expect(files.length).toBeGreaterThan(100);
    expect(writers.length).toBeGreaterThan(4);
  });

  it('každú zapísanú adresu vie tabuľka prečítať', () => {
    const unknown = writers
      .filter(({ literal }) => !candidatePaths(literal).some((p) => matchDashboardRoute(p) !== null))
      .map(({ file, literal }) => `${file}: ${literal}`);

    expect(unknown).toEqual([]);
  });

  it('v dashboarde sa adresa neskladá vlastným reťazcom', () => {
    const offenders = writers
      .filter(({ file }) => file.startsWith(TABLE_DRIVEN_PREFIX) && !KNOWN_UNWIRED.has(file))
      .map(({ file, literal }) => `${file}: ${literal}`);

    expect(offenders).toEqual([]);
  });

  it('priznané výnimky stále existujú – inak ich treba zo zoznamu vyhodiť', () => {
    for (const relative of KNOWN_UNWIRED) {
      expect(writers.some(({ file }) => file === relative)).toBe(true);
    }
  });
});

describe('bodkové overenie: adresy sa po refaktore nezmenili', () => {
  /** Čo `handleMainModuleChange` skladalo vlastným reťazcom `if/else`. */
  const MAIN_MODULE_URLS: Array<[string, string]> = [
    ['home', '/dashboard'],
    ['search', '/dashboard/search'],
    ['settings', '/dashboard/settings'],
    ['notifications', '/dashboard/notifications'],
    ['notification-settings', '/dashboard/settings/notifications'],
    ['account-settings', '/dashboard/settings/account'],
    ['blocked-users', '/dashboard/settings/blocked'],
    ['language', '/dashboard/language'],
    ['account-type', '/dashboard/account-type'],
    ['privacy', '/dashboard/privacy'],
    ['favorites', '/dashboard/favorites'],
    ['watches', '/dashboard/watches'],
    ['messages', '/dashboard/messages'],
    ['requests', '/dashboard/requests'],
    ['skills', '/dashboard/skills'],
    ['skills-offer', '/dashboard/skills/offer'],
    ['skills-search', '/dashboard/skills/search'],
    ['statistics', '/dashboard/statistics'],
    ['profile', '/dashboard/profile'],
  ];

  it.each(MAIN_MODULE_URLS)('handleMainModuleChange(%s) → %s', (moduleId, expected) => {
    expect(dashboardSectionPath(moduleId)).toBe(expected);
  });

  it('modul, ktorý zoznam nepoznal, adresu nedostane ani teraz', () => {
    // Vlastný reťazec tieto moduly nemenoval, takže adresa ostávala
    // `/dashboard`; tabuľka pre ne nesmie vymyslieť inú.
    expect(dashboardSectionPath('skills-describe')).toBeNull();
    expect(dashboardSectionPath('skills-select-category')).toBeNull();
    expect(dashboardSectionPath('create')).toBeNull();
    // Trasy s parametrom sa ako sekcia skladať nedajú.
    expect(dashboardSectionPath('user-profile')).toBeNull();
    expect(dashboardSectionPath('portfolio-detail')).toBeNull();
    expect(dashboardSectionPath('feed-post-detail')).toBeNull();
  });

  it('handleRightItemClick: sekcie Nastavení a sledované ponuky', () => {
    // Presne hodnoty, ktoré mal `SECTION_PATHS` napísané ako literály.
    expect(dashboardSectionPath('settings')).toBe('/dashboard/settings');
    expect(dashboardSectionPath('settings', 'offer-watches')).toBe('/dashboard/settings/watches');
    expect(dashboardSectionPath('notification-settings')).toBe('/dashboard/settings/notifications');
    expect(dashboardSectionPath('account-settings')).toBe('/dashboard/settings/account');
    expect(dashboardSectionPath('blocked-users')).toBe('/dashboard/settings/blocked');
    expect(dashboardSectionPath('account-type')).toBe('/dashboard/account-type');
    expect(dashboardSectionPath('privacy')).toBe('/dashboard/privacy');
    expect(dashboardSectionPath('language')).toBe('/dashboard/language');
  });

  it('routery Zručností', () => {
    expect(dashboardSectionPath('skills')).toBe('/dashboard/skills');
    expect(dashboardSectionPath('skills-offer')).toBe('/dashboard/skills/offer');
    expect(dashboardSectionPath('skills-search')).toBe('/dashboard/skills/search');
  });

  it('adresa profilu: slug aj číselné ID ako doteraz', () => {
    expect(dashboardProfilePath('jana')).toBe('/dashboard/users/jana');
    expect(dashboardProfilePath('jana.novakova')).toBe('/dashboard/users/jana.novakova');
    expect(dashboardProfilePath('user-42')).toBe('/dashboard/users/user-42');
    expect(dashboardProfilePath('7')).toBe('/dashboard/users/7');
  });

  it('čo zapisovač zapíše, to čítanie vráti späť', () => {
    for (const [moduleId] of MAIN_MODULE_URLS) {
      const url = dashboardSectionPath(moduleId);
      expect(url).not.toBeNull();
      expect(matchDashboardRoute(url!)?.initialRoute).toBe(moduleId);
    }

    const watches = dashboardSectionPath('settings', 'offer-watches');
    expect(matchDashboardRoute(watches!)).toEqual({
      initialRoute: 'settings',
      initialRightItem: 'offer-watches',
    });

    const profile = dashboardProfilePath('jana');
    expect(matchDashboardRoute(profile!)).toEqual({
      initialRoute: 'user-profile',
      initialViewedUserId: null,
      initialProfileSlug: 'jana',
      initialHighlightedSkillId: null,
    });
  });

  it('staviteľku má každá trasa s parametrom, ktorú zapisovači používajú', () => {
    const profileRoute = DASHBOARD_ROUTES.find((route) => route.page === 'users/[userId]');
    expect(profileRoute?.build).toBeDefined();
  });
});
