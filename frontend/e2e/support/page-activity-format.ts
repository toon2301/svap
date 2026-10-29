// Čisté pomôcky na zostavenie dôkazov o páde E2E testu. Nesmú importovať Playwright za behu, aby ich vedel otestovať Jest
// (`src/components/__tests__/E2ePageActivity.test.ts`).
//
// Dôkazy sa tlačia do výstupu behu a prikladajú k testu, preto obsahujú len to, čo osobné údaje nenesie: cesty bez
// slugov a ID používateľov, názvy parametrov bez hodnôt, počty a časy. Telá odpovedí, texty z konzoly a texty stránky
// sa sem nikdy nedostanú. Z chyby stránky sa vypíše len jej druh (napr. `TypeError`), nikdy text správy: ten môže
// obsahovať kus spracúvaných údajov (napr. `JSON.parse` vloží do správy časť vstupu).
//
// Pravidlo pre každú hodnotu z prehliadača: nevypíše sa jej text, ani skrátený alebo „očistený“, ale len číslo, príznak
// alebo jedna z pevných hodnôt zo zoznamov nižšie (zlyhanie siete → druh, aktívny prvok → značka a povolené hodnoty
// atribútov). Čokoľvek mimo zoznamu sa vypíše ako `other`, takže ani nový slug, adresa či ID sa do bloku nedostanú. Čistí
// sa tu, v čistých pomôckach, aby to strážil Jest.

/** Jedna požiadavka stránky (API alebo navigácia) so stavom a trvaním. */
export type ActivityEntry = {
  method: string;
  /** Cesta po `normalizePath`. */
  path: string;
  /** Názvy parametrov po `queryNames`. */
  query: string;
  /** Čas začiatku v ms od začiatku testu. */
  startedAt: number;
  /** Trvanie v ms; `null`, kým požiadavka beží. */
  durationMs: number | null;
  /** HTTP stav, `null` keď ešte nie je známy. */
  status: number | null;
  /** Surový text zlyhania siete, ak požiadavka zlyhala; vypíše sa len ako druh cez `failureKind`. */
  failure: string | null;
};

/**
 * Prvok s fokusom tak, ako ho prečítal prehliadač. Hodnoty sú surové (môže ich nastaviť ktokoľvek, kto vie meniť DOM),
 * preto sa vypisujú až cez `describeActive`, ktoré pustí len pevné zoznamy.
 */
export type ActiveElement = {
  tag: string;
  role: string | null;
  type: string | null;
  navItem: string | null;
  onboarding: string | null;
};

/** Stav stránky v čase pádu, zmeraný v prehliadači. */
export type PageSnapshot = {
  readyState: string;
  /** Kedy (ms od začiatku navigácie aktuálneho dokumentu) skončili udalosti DOMContentLoaded a load; `null`, kým neskončili. */
  domContentLoadedMs: number | null;
  loadMs: number | null;
  loadingMarkers: number;
  scrollTop: number | null;
  scrollHeight: number | null;
  clientHeight: number | null;
  panelAriaHidden: string | null;
  viewerReady: boolean;
  /** `null`, keď dokument nemá žiadny prvok s fokusom. */
  active: ActiveElement | null;
};

export type EvidenceInput = {
  title: string;
  project: string;
  elapsedMs: number;
  url: string;
  entries: ActivityEntry[];
  pageErrors: string[];
  consoleErrors: number;
  snapshot: PageSnapshot | null;
};

const MAX_ENTRIES = 40;
/** Štandardné druhy chýb; akýkoľvek iný názov (vlastná trieda) sa vypíše ako `Error`. */
const KNOWN_ERROR_KINDS = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError', 'AggregateError',
]);
// Za týmito segmentmi nasleduje identifikátor používateľa alebo profilu.
const IDENTIFIER_PARENTS = new Set(['users', 'user', 'profile', 'profiles', 'slug', 'owner']);
// Za týmito segmentmi nasleduje prihlasovací údaj: odkaz na obnovu hesla nesie `uidb64` a `token`, overenie e-mailu adresu.
// Nahradí sa všetko, čo za nimi nasleduje.
const CREDENTIAL_PARENTS = new Set(['reset-password', 'password-reset', 'password-reset-verify', 'check-email']);

/** Chromium uvádza zlyhanie siete pevným kódom (`net::ERR_TIMED_OUT`); povolené sú len veľké písmená, číslice a `_`. */
const CHROMIUM_FAILURE_CODE = /^net::ERR_[A-Z0-9_]{1,50}$/;
/**
 * Iné prehliadače píšu zlyhanie vetou, ktorá môže obsahovať adresu alebo názov servera (napr. WebKit pri zlom certifikáte).
 * Z vety sa uchová len druh podľa kľúčového slova; poradie rozhoduje, prvá zhoda vyhráva.
 */
const FAILURE_KINDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/time[ds]? ?out/i, 'timeout'],
  [/cancel|abort/i, 'cancelled'],
  [/lost|reset|closed/i, 'connection-lost'],
  [/offline|not connected to the internet/i, 'offline'],
  [/hostname|dns|resolve/i, 'dns'],
  [/refused|could not connect|cannot connect|unreachable/i, 'unreachable'],
  [/certificate|secure connection|ssl|tls/i, 'tls'],
];

// Povolené hodnoty stavu stránky a aktívneho prvku; hodnota mimo zoznamu sa vypíše ako `other`.
const READY_STATES = new Set(['loading', 'interactive', 'complete']);
const ARIA_HIDDEN_VALUES = new Set(['true', 'false']);
const ACTIVE_TAGS = new Set([
  'A', 'ARTICLE', 'ASIDE', 'BODY', 'BUTTON', 'DETAILS', 'DIALOG', 'DIV', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HEADER', 'HTML', 'IFRAME', 'IMG', 'INPUT', 'LABEL', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'SECTION', 'SELECT', 'SPAN', 'SUMMARY',
  'SVG', 'TEXTAREA', 'UL', 'VIDEO',
]);
const ACTIVE_ROLES = new Set([
  'alertdialog', 'article', 'button', 'cell', 'checkbox', 'combobox', 'dialog', 'gridcell', 'group', 'img', 'link', 'list',
  'listbox', 'listitem', 'main', 'menu', 'menubar', 'menuitem', 'navigation', 'none', 'option', 'presentation', 'radio',
  'region', 'row', 'search', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'tablist', 'tabpanel', 'textbox',
  'toolbar', 'treeitem',
]);
const ACTIVE_INPUT_TYPES = new Set([
  'button', 'checkbox', 'color', 'date', 'datetime-local', 'email', 'file', 'hidden', 'image', 'month', 'number', 'password',
  'radio', 'range', 'reset', 'search', 'submit', 'tel', 'text', 'time', 'url', 'week',
]);
// Hodnoty `data-sidebar-nav-item` (Sidebar.tsx) a `data-onboarding` (onboarding/*, MobileTopNav.tsx a stránky profilu).
const NAV_ITEMS = new Set([
  'home', 'search', 'messages', 'favorites', 'requests', 'notifications', 'statistics', 'watches', 'profile', 'settings',
]);
const ONBOARDING_TARGETS = new Set([
  'home-welcome', 'messages-create-group', 'messages-nav-icon', 'messages-tabs', 'profile-edit-button', 'profile-edit-form',
  'profile-edit-save', 'profile-header', 'profile-icon', 'profile-skills-button', 'requests-nav-icon', 'requests-tabs',
  'search-filter', 'search-input', 'search-nav-icon',
]);

/** Hodnota z prehliadača prejde, len ak je v zozname povolených; inak sa vypíše `other` (nikdy jej text). */
function allowed(value: unknown, list: ReadonlySet<string>): string {
  return typeof value === 'string' && list.has(value) ? value : 'other';
}

/**
 * Nahradí identifikátory v ceste zástupnými názvami: číselné segmenty, segmenty za `users`/`profile`, slugy s bodkou alebo
 * `@` a všetko za `reset-password`, `password-reset`, `password-reset-verify` a `check-email` (token, `uidb64`, e-mail).
 */
export function normalizePath(pathname: string): string {
  const segments = pathname.split('/');
  let afterCredential = false;
  return segments.map((segment, index) => {
    if (!segment) return segment;
    if (afterCredential) return ':id';
    if (CREDENTIAL_PARENTS.has(segment.toLowerCase())) afterCredential = true;
    if (/^\d+$/.test(segment)) return ':n';
    if (/[.@]/.test(segment)) return ':id';
    const parent = index > 0 ? segments[index - 1].toLowerCase() : '';
    return IDENTIFIER_PARENTS.has(parent) ? ':id' : segment;
  }).join('/');
}

/** Názvy parametrov adresy bez hodnôt; hľadaný výraz `q` len s dĺžkou. */
export function queryNames(search: string): string {
  const params = new URLSearchParams(search);
  const names = Array.from(new Set(Array.from(params.keys()))).sort();
  return names.map((name) => (name === 'q' ? `q(${(params.get('q') ?? '').length})` : name)).join(',');
}

/** Z chyby stránky vráti len druh (názov štandardnej triedy). Text správy sa nikdy nevracia, ani skrátený. */
export function errorKind(raw: string): string {
  const name = raw.trim().split(/[:\s]/, 1)[0] ?? '';
  return KNOWN_ERROR_KINDS.has(name) ? name : 'Error';
}

/**
 * Zlyhanie siete sa vypíše ako druh, nikdy ako text: kód Chromia (`net::ERR_TIMED_OUT`) sa ponechá, veta iného prehliadača
 * sa zmení na jedno z pevných slov (`timeout`, `cancelled`, `connection-lost`, …), všetko ostatné je `failed`. Veta môže
 * obsahovať adresu, IP alebo názov servera, preto sa z nej nikdy nič neprepisuje.
 */
export function failureKind(text: string | null): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return 'unknown';
  if (CHROMIUM_FAILURE_CODE.test(flat)) return flat;
  return FAILURE_KINDS.find(([pattern]) => pattern.test(flat))?.[1] ?? 'failed';
}

/**
 * Popis aktívneho prvku (`TAG atribút=hodnota …`) len z povolených zoznamov: značka, `role`, `type`, `data-sidebar-nav-item`
 * a `data-onboarding`. Iné atribúty (`data-testid`, `id`, `name`, `aria-label`) sa nečítajú a hodnota mimo zoznamu sa
 * vypíše ako `other`, takže ani slug alebo ID v atribúte sa do bloku nedostane.
 */
export function describeActive(active: ActiveElement | null): string {
  if (!active) return 'none';
  const tag = typeof active.tag === 'string' ? active.tag.toUpperCase() : '';
  const parts = [ACTIVE_TAGS.has(tag) ? tag : 'OTHER'];
  const attributes: ReadonlyArray<readonly [string, string | null, ReadonlySet<string>]> = [
    ['role', active.role, ACTIVE_ROLES],
    ['type', active.type, ACTIVE_INPUT_TYPES],
    ['data-sidebar-nav-item', active.navItem, NAV_ITEMS],
    ['data-onboarding', active.onboarding, ONBOARDING_TARGETS],
  ];
  for (const [name, value, list] of attributes) {
    if (typeof value === 'string' && value !== '') parts.push(`${name}=${allowed(value, list)}`);
  }
  return parts.join(' ');
}

/** Jeden riadok požiadavky: čas začiatku, metóda, cesta s názvami parametrov, stav (alebo druh zlyhania) a trvanie. */
function formatEntry(entry: ActivityEntry): string {
  const status = entry.failure ? `FAILED(${failureKind(entry.failure)})` : entry.status === null ? 'pending' : String(entry.status);
  const duration = entry.durationMs === null ? '…' : `${entry.durationMs} ms`;
  const query = entry.query ? ` [${entry.query}]` : '';
  return `${String(entry.startedAt).padStart(6)}  ${entry.method.padEnd(4)} ${entry.path}${query}  ${status}  ${duration}`;
}

/** Riadky so stavom stránky (načítanie, panel, posun, aktívny prvok); bez snímky stránky jeden riadok `unavailable`. */
function formatSnapshot(snapshot: PageSnapshot | null): string[] {
  if (!snapshot) return ['page state: unavailable (page closed or not responding)'];
  const panelAriaHidden = snapshot.panelAriaHidden === null ? 'n/a' : allowed(snapshot.panelAriaHidden, ARIA_HIDDEN_VALUES);
  return [
    `page state: readyState=${allowed(snapshot.readyState, READY_STATES)} viewerReady=${snapshot.viewerReady}`
      + ` loadingMarkers=${snapshot.loadingMarkers} panelAriaHidden=${panelAriaHidden}`,
    `document timing (ms since navigation start): domContentLoaded=${snapshot.domContentLoadedMs ?? 'n/a'} load=${snapshot.loadMs ?? 'n/a'}`,
    `scroll root: scrollTop=${snapshot.scrollTop ?? 'n/a'} scrollHeight=${snapshot.scrollHeight ?? 'n/a'}`
      + ` clientHeight=${snapshot.clientHeight ?? 'n/a'}`,
    `active element: ${describeActive(snapshot.active)}`,
  ];
}

/** Zostaví čitateľný blok dôkazov pre výstup behu a prílohu testu. */
export function formatEvidence(input: EvidenceInput): string {
  const shown = input.entries.slice(-MAX_ENTRIES);
  const hidden = input.entries.length - shown.length;
  const lines = [
    `[E2E-EVIDENCE] ${input.title} | ${input.project} | ${(input.elapsedMs / 1000).toFixed(1)} s`,
    `url: ${input.url}`,
    ...formatSnapshot(input.snapshot),
    `requests (ms since test start${hidden > 0 ? `, ${hidden} older omitted` : ''}):`,
    ...(shown.length ? shown.map(formatEntry) : ['  none']),
    `page errors: ${input.pageErrors.length}${input.pageErrors.length ? ` (${input.pageErrors.slice(0, 3).map(errorKind).join(', ')})` : ''}`
      + ` | console errors: ${input.consoleErrors}`,
  ];
  return lines.join('\n');
}
