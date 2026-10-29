import type { Page, Request, TestInfo } from '@playwright/test';
import {
  formatEvidence,
  normalizePath,
  queryNames,
  type ActiveElement,
  type ActivityEntry,
  type PageSnapshot,
} from './page-activity-format';

// Pozoruje požiadavky stránky počas testu. Slúži na dve veci:
//  1. `searchQuietForMs` hovorí, či stránka ešte čaká na hľadanie (viď `search-settled.ts`),
//  2. pri páde testu sa z pozorovania zostaví blok dôkazov bez osobných údajov (`reportFailureEvidence`).
// Špecy majú vypnuté trace, screenshot aj video kvôli súkromiu, takže bez tohto by po páde ostal len jeden riadok chyby.

const OBSERVED_TYPES = new Set(['document', 'fetch', 'xhr']);
const SEARCH_PATH_PREFIXES = ['/api/auth/search', '/api/auth/dashboard/search'];

/** Či požiadavka patrí do dôkazov: navigácia dokumentu, volanie API alebo načítanie dát stránky (`_rsc`). */
function isRelevant(request: Request): boolean {
  if (!OBSERVED_TYPES.has(request.resourceType())) return false;
  const url = new URL(request.url());
  return request.resourceType() === 'document' || url.pathname.startsWith('/api/') || url.searchParams.has('_rsc');
}

/** Či ide o hľadanie, na ktoré čaká `searchQuietForMs` (cesty z `SEARCH_PATH_PREFIXES`). */
function isSearch(request: Request): boolean {
  const { pathname } = new URL(request.url());
  return SEARCH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Tento kód sa serializuje do prehliadača; nesmie používať nič z modulu. Vracia čísla, príznaky a surové hodnoty vybraných
 * atribútov aktívneho prvku; do výpisu sa dostanú až cez `describeActive`, ktoré pustí len pevné zoznamy.
 */
function readPageSnapshot(): PageSnapshot {
  const main = document.querySelector<HTMLElement>('[data-dashboard-main]');
  const panel = document.querySelector('[data-search-scroll-root]')?.previousElementSibling ?? null;
  const active = document.activeElement as HTMLElement | null;
  /** Hodnota atribútu skrátená na 40 znakov; `null`, keď atribút chýba. */
  const attribute = (element: HTMLElement, name: string): string | null => element.getAttribute(name)?.slice(0, 40) ?? null;
  /** Surový popis prvku s fokusom; do výpisu sa dostane až cez `describeActive`. */
  const describe = (element: HTMLElement | null): ActiveElement | null => (element ? {
    tag: element.tagName,
    role: attribute(element, 'role'),
    type: attribute(element, 'type'),
    navItem: attribute(element, 'data-sidebar-nav-item'),
    onboarding: attribute(element, 'data-onboarding'),
  } : null);
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  /** Čas udalosti zaokrúhlený na ms; `null`, kým udalosť neskončila (hodnota chýba alebo je 0). */
  const finished = (value: number | undefined): number | null => (value && value > 0 ? Math.round(value) : null);
  return {
    readyState: document.readyState,
    domContentLoadedMs: finished(navigation?.domContentLoadedEventEnd),
    loadMs: finished(navigation?.loadEventEnd),
    loadingMarkers: main ? main.querySelectorAll('[data-search-loading="true"]').length : 0,
    scrollTop: main ? Math.round(main.scrollTop) : null,
    scrollHeight: main ? main.scrollHeight : null,
    clientHeight: main ? main.clientHeight : null,
    panelAriaHidden: panel ? panel.getAttribute('aria-hidden') : null,
    viewerReady: document.querySelector('[data-onboarding="search-input"] input') !== null,
    active: describe(active),
  };
}

export class PageActivity {
  private readonly startedAt = Date.now();
  private readonly entries = new Map<Request, ActivityEntry>();
  private searchInFlight = 0;
  private lastSearchActivityAt = 0;
  private readonly pageErrors: string[] = [];
  private consoleErrors = 0;

  /** Pripojí sa na udalosti stránky; z chyby stránky uchová len názov a z konzoly len počet chýb. */
  constructor(private readonly page: Page) {
    page.on('request', (request) => this.onRequest(request));
    page.on('requestfinished', (request) => void this.onFinished(request));
    page.on('requestfailed', (request) => this.onFailed(request));
    // Z chyby stránky sa uchová len názov; text správy môže obsahovať spracúvané údaje a nesmie sa dostať do výpisu.
    page.on('pageerror', (error) => this.pageErrors.push(error.name));
    page.on('console', (message) => {
      if (message.type() === 'error') this.consoleErrors += 1;
    });
  }

  /** Zapíše novú požiadavku (cesta a názvy parametrov bez hodnôt) a započíta hľadanie, ktoré práve beží. */
  private onRequest(request: Request): void {
    if (!isRelevant(request)) return;
    const url = new URL(request.url());
    this.entries.set(request, {
      method: request.method(),
      path: normalizePath(url.pathname),
      query: queryNames(url.search),
      startedAt: Date.now() - this.startedAt,
      durationMs: null,
      status: null,
      failure: null,
    });
    if (isSearch(request)) {
      this.searchInFlight += 1;
      this.lastSearchActivityAt = Date.now();
    }
  }

  /** Doplní trvanie a HTTP stav dokončenej požiadavky; stav sa môže stratiť, ak sa stránka zavrela skôr. */
  private async onFinished(request: Request): Promise<void> {
    const entry = this.entries.get(request);
    if (!entry) return;
    entry.durationMs = Date.now() - this.startedAt - entry.startedAt;
    this.finishSearch(request);
    try {
      entry.status = (await request.response())?.status() ?? null;
    } catch {
      /* Stránka sa mohla zavrieť skôr, než prišiel stav; trvanie ostáva zapísané. */
    }
  }

  /** Zapíše trvanie a surový text zlyhania siete; do výpisu z neho prejde len druh cez `failureKind`. */
  private onFailed(request: Request): void {
    const entry = this.entries.get(request);
    if (!entry) return;
    entry.durationMs = Date.now() - this.startedAt - entry.startedAt;
    // Surový text zostáva len v pamäti; do bloku prejde výlučne ako druh cez `failureKind` (veta môže obsahovať adresu).
    entry.failure = request.failure()?.errorText ?? 'unknown';
    this.finishSearch(request);
  }

  /** Ukončí započítané hľadanie a zapíše čas poslednej aktivity hľadania. */
  private finishSearch(request: Request): void {
    if (!isSearch(request)) return;
    this.searchInFlight = Math.max(0, this.searchInFlight - 1);
    this.lastSearchActivityAt = Date.now();
  }

  /** Ako dlho (ms) nebeží ani nezačalo ani neskončilo žiadne hľadanie; 0, kým nejaké beží; nekonečno, kým sa žiadne nestalo. */
  searchQuietForMs(): number {
    if (this.searchInFlight > 0) return 0;
    return this.lastSearchActivityAt === 0 ? Number.POSITIVE_INFINITY : Date.now() - this.lastSearchActivityAt;
  }

  /** Zostaví blok dôkazov; stav stránky je `null`, keď sa stránka zavrela alebo neodpovedá. */
  async report(title: string, project: string): Promise<string> {
    let snapshot: PageSnapshot | null = null;
    let url = 'n/a';
    try {
      snapshot = await this.page.evaluate(readPageSnapshot);
      const current = new URL(this.page.url());
      url = `${normalizePath(current.pathname)}${current.search ? ` [${queryNames(current.search)}]` : ''}`;
    } catch {
      /* Pád mohol zhodiť aj stránku; dôkazy o požiadavkách sa vypíšu aj tak. */
    }
    return formatEvidence({
      title,
      project,
      elapsedMs: Date.now() - this.startedAt,
      url,
      entries: Array.from(this.entries.values()),
      pageErrors: this.pageErrors,
      consoleErrors: this.consoleErrors,
      snapshot,
    });
  }
}

const observed = new WeakMap<Page, PageActivity>();

/** Začne pozorovať stránku; opakované volanie vráti ten istý pozorovateľ. Volať PRED prvým `page.goto`. */
export function observePage(page: Page): PageActivity {
  let activity = observed.get(page);
  if (!activity) {
    activity = new PageActivity(page);
    observed.set(page, activity);
  }
  return activity;
}

/** Do `afterEach`: pri páde alebo vypršaní času vypíše dôkazy a pripojí ich k testu. Úspešné a preskočené testy ignoruje. */
export async function reportFailureEvidence(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.status === testInfo.expectedStatus) return;
  const activity = observed.get(page);
  if (!activity) return;
  const text = await activity.report(testInfo.titlePath.join(' › '), testInfo.project.name);
  console.log(text);
  await testInfo.attach('failure-evidence', { body: text, contentType: 'text/plain' });
}
