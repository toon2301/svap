import type { Page, Request } from '@playwright/test';
import type { CategoryChange } from './notification-category-roundtrip';
import { parseAppDuration } from './response-diagnostics-format';

export const PREFERENCES_PATH = '/api/auth/push/preferences/';
export const NOTIFICATION_SETTINGS_PATH = '/dashboard/settings/notifications';
export const CATEGORY_ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';
type Phase = 'ready' | 'ui' | 'restore' | 'sealed';

/** Presmerovanie nie je koniec zápisu; ani proxy 5xx bez dôkazu ukončenia aplikácie. */
export function categoryReplyCompleted(status: number, appDuration: unknown): boolean {
  return (status >= 200 && status < 300) || (status >= 400 && status < 500)
    || (status >= 500 && status <= 599 && typeof parseAppDuration(appDuration) === 'number');
}

/** Strážca rozlišuje jeden UI PATCH od jedného sedempoložkového návratu; hodnoty nevypisuje. */
export class CategoryWriteAudit {
  private phase: Phase = 'ready';
  private uiAttempts = 0;
  private restores = 0;
  private rejected = 0;
  private restoreRejected = false;
  private uncertain = false;
  private pending = new Set<object>();
  constructor(private readonly change: CategoryChange) {}

  /** Označenie pred tap/click chráni aj pokus, ktorého výsledok nie je známy. */
  arm(): void { this.change.arm(); this.phase = 'ui'; }

  /** Čisté rozhodnutie sa dá kontrolovať bez prehliadača alebo siete. */
  allow(payload: unknown, request: object): boolean {
    try {
      if (this.phase === 'ui') {
        this.uiAttempts += 1;
        const valid = this.uiAttempts === 1 && payload && typeof payload === 'object'
          && !Array.isArray(payload) && Object.keys(payload).length === 1
          && Object.prototype.hasOwnProperty.call(payload, 'notify_likes')
          && (payload as Record<string, unknown>).notify_likes === this.change.target;
        if (valid) { this.pending.add(request); return true; }
      } else if (this.phase === 'restore') {
        // Neskorý jednokľúčový UI zápis nesmie spotrebovať jediný povolený návrat.
        if (this.change.matchesRestore(payload)) {
          this.restores += 1;
          if (this.restores === 1) return true;
        }
        this.restoreRejected = true;
      }
    } catch { /* Neplatný payload ani getter nesmie preniesť súkromný text do chyby. */ }
    if (this.phase === 'restore') this.restoreRejected = true;
    this.rejected += 1;
    return false;
  }

  /** Ostatné zápisy API sa zablokujú ešte pred serverom. */
  rejectOtherWrite(): void { this.rejected += 1; if (this.phase === 'restore') this.restoreRejected = true; }
  /** Aplikačná odpoveď končí synchrónny zápis, no odpoveď samotnej proxy to nedokazuje. */
  responded(request: object, completed: boolean): void {
    if (this.pending.delete(request) && !completed) this.uncertain = true;
  }
  /** Ukončenie bez známej odpovede nevylučuje neskorý zápis servera. */
  finished(request: object): void {
    if (this.pending.delete(request)) this.uncertain = true;
  }
  /** Pred návratom sa zapamätá aj stále otvorená UI požiadavka. */
  beginRestore(): void { if (this.pending.size) this.uncertain = true; this.phase = 'restore'; }
  /** Po návrate ostáva route strážca až do zavretia kontextu, ďalší zápis nepovolí. */
  seal(): void { this.phase = 'sealed'; }

  assertUIComplete(): void {
    if (this.uiAttempts !== 1 || this.rejected) throw new Error('UI neposlalo práve jeden povolený jednokľúčový PATCH kategórie.');
  }
  assertRestoreSafe(): void {
    if (this.uncertain || this.pending.size || this.restores !== 1 || this.restoreRejected) {
      throw new Error('Zápisy po UI pokuse nie sú bezpečne ukončené.');
    }
  }
  /** Iba počty a prevádzkové príznaky, nikdy hodnoty nastavení alebo obsah požiadavky. */
  evidence(): string {
    return `[E2E-CATEGORY-AUDIT] ui=${this.uiAttempts} restore=${this.restores} rejected=${this.rejected} pending=${this.pending.size} uncertain=${this.uncertain} restoreRejected=${this.restoreRejected}`;
  }
}

/** Predchádzajúce lokálne routes môžu požiadavku vybaviť; live fallback používa skutočnú sieť. */
export async function guardCategoryWrites(page: Page, audit: CategoryWriteAudit): Promise<void> {
  page.on('response', response => {
    let duration: unknown;
    try { duration = response.headers()['x-app-duration-ms']; } catch { /* Chýbajúci dôkaz nie je potvrdenie. */ }
    audit.responded(response.request(), categoryReplyCompleted(response.status(), duration));
  });
  page.on('requestfinished', request => audit.finished(request));
  page.on('requestfailed', request => audit.finished(request));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) { await route.fallback(); return; }
    const refresh = ['/api/token/refresh/', '/api/auth/token/refresh/'].includes(url.pathname);
    if (url.origin === CATEGORY_ORIGIN && method === 'POST' && refresh) { await route.fallback(); return; }
    if (url.origin === CATEGORY_ORIGIN && method === 'PATCH' && url.pathname === PREFERENCES_PATH) {
      let payload: unknown;
      try { payload = request.postDataJSON(); } catch { payload = null; }
      if (audit.allow(payload, request)) { await route.fallback(); return; }
    } else audit.rejectOtherWrite();
    await route.abort();
  });
}

/** Iba pevná URL, metóda a HTTP stav; žiadne telo alebo hlavičky odpovede. */
export function isCategoryPatch(request: Request): boolean {
  const url = new URL(request.url());
  return url.origin === CATEGORY_ORIGIN && url.pathname === PREFERENCES_PATH && request.method() === 'PATCH';
}
