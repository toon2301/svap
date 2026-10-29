// Čisté pomôcky na zostavenie dôkazov o páde E2E testu. Nesmú importovať Playwright za behu, aby ich vedel otestovať Jest
// (`src/components/__tests__/E2ePageActivity.test.ts`).
//
// Dôkazy sa tlačia do výstupu behu a prikladajú k testu, preto obsahujú len to, čo osobné údaje nenesie: cesty bez
// slugov a ID používateľov, názvy parametrov bez hodnôt, počty a časy. Telá odpovedí, texty z konzoly a texty stránky
// sa sem nikdy nedostanú. Z chyby stránky sa vypíše len jej druh (napr. `TypeError`), nikdy text správy: ten môže
// obsahovať kus spracúvaných údajov (napr. `JSON.parse` vloží do správy časť vstupu). Každý voľný text, ktorý do bloku
// prejde (zlyhanie siete, aktívny prvok, chyby), sa čistí tu, v čistých pomôckach, aby to strážil Jest.

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
  /** Text zlyhania siete, ak požiadavka zlyhala. */
  failure: string | null;
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
  active: string;
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

/** Nahradí identifikátory v ceste zástupnými názvami: číselné segmenty, segmenty za `users`/`profile` a slugy s bodkou. */
export function normalizePath(pathname: string): string {
  const segments = pathname.split('/');
  return segments.map((segment, index) => {
    if (!segment) return segment;
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

/** Zlyhanie siete prejde, len ak vyzerá ako kód alebo krátka veta (`net::ERR_TIMED_OUT`), nie ako adresa či e-mail. */
export function safeFailure(text: string | null): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return 'unknown';
  return /^[A-Za-z0-9_:. -]{1,60}$/.test(flat) && !/[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(flat) ? flat : 'failed';
}

/**
 * Popis aktívneho prvku (`TAG atribút=hodnota …`): číslice v hodnote (ID v `data-testid`) sa nahradia `#` a hodnota, ktorá
 * nie je obyčajný identifikátor, sa nahradí `?`.
 */
export function safeActive(text: string): string {
  return text.split(' ').slice(0, 8).map((token) => {
    const [key, ...rest] = token.split('=');
    if (!rest.length) return /^[A-Za-z]{1,20}$/.test(token) ? token : '?';
    const value = rest.join('=').replace(/\d+/g, '#');
    return `${/^[a-z-]{1,24}$/.test(key) ? key : '?'}=${/^[A-Za-z#_-]{1,40}$/.test(value) ? value : '?'}`;
  }).join(' ');
}

function formatEntry(entry: ActivityEntry): string {
  const status = entry.failure ? `FAILED(${safeFailure(entry.failure)})` : entry.status === null ? 'pending' : String(entry.status);
  const duration = entry.durationMs === null ? '…' : `${entry.durationMs} ms`;
  const query = entry.query ? ` [${entry.query}]` : '';
  return `${String(entry.startedAt).padStart(6)}  ${entry.method.padEnd(4)} ${entry.path}${query}  ${status}  ${duration}`;
}

function formatSnapshot(snapshot: PageSnapshot | null): string[] {
  if (!snapshot) return ['page state: unavailable (page closed or not responding)'];
  return [
    `page state: readyState=${snapshot.readyState} viewerReady=${snapshot.viewerReady} loadingMarkers=${snapshot.loadingMarkers}`
      + ` panelAriaHidden=${snapshot.panelAriaHidden ?? 'n/a'}`,
    `document timing (ms since navigation start): domContentLoaded=${snapshot.domContentLoadedMs ?? 'n/a'} load=${snapshot.loadMs ?? 'n/a'}`,
    `scroll root: scrollTop=${snapshot.scrollTop ?? 'n/a'} scrollHeight=${snapshot.scrollHeight ?? 'n/a'}`
      + ` clientHeight=${snapshot.clientHeight ?? 'n/a'}`,
    `active element: ${safeActive(snapshot.active)}`,
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
