// Čisté pomôcky na zostavenie dôkazov o páde E2E testu. Nesmú importovať Playwright za behu, aby ich vedel otestovať Jest
// (`src/components/__tests__/E2ePageActivity.test.ts`).
//
// Dôkazy sa tlačia do výstupu behu a prikladajú k testu, preto obsahujú len to, čo osobné údaje nenesie: cesty bez
// slugov a ID používateľov, názvy parametrov bez hodnôt, počty a časy. Telá odpovedí, texty z konzoly a texty stránky
// sa sem nikdy nedostanú.

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
const MAX_ERROR_LENGTH = 120;
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

/** Skráti text chyby stránky na bezpečnú dĺžku a zahodí prípadné zalomenia riadkov. */
export function shortError(message: string): string {
  const flat = message.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_ERROR_LENGTH ? `${flat.slice(0, MAX_ERROR_LENGTH)}…` : flat;
}

function formatEntry(entry: ActivityEntry): string {
  const status = entry.failure ? `FAILED(${entry.failure})` : entry.status === null ? 'pending' : String(entry.status);
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
    `active element: ${snapshot.active}`,
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
    `page errors: ${input.pageErrors.length}${input.pageErrors.length ? ` (${input.pageErrors.slice(0, 3).map(shortError).join(' | ')})` : ''}`
      + ` | console errors: ${input.consoleErrors}`,
  ];
  return lines.join('\n');
}
