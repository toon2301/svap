import type { Page, TestInfo } from '@playwright/test';
import { captureWithin } from './evidence-deadline';

const LOCALES = ['sk', 'cs', 'en', 'de', 'pl', 'hu'] as const;
const KINDS = ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click'] as const;
type Locale = typeof LOCALES[number];
type StoredLocale = Locale | 'other';
type Phase = 'capture' | 'bubble';
type Kind = typeof KINDS[number];
type TapEvent = {
  phase: Phase; kind: Kind; choice: Locale; stored: StoredLocale;
  prevented: boolean; trusted: boolean; atMs: number;
};
type TapState = { events: TapEvent[]; dropped: number };
type TapWindow = Window & { __svaplyLanguageTapV1?: TapState };
type BackLabels = Record<Locale, string>;
type TapMoment = 'before-reload' | 'finally';

/** Zachytí iba udalosti šiestich jazykových volieb, nikdy ich neruší ani nevyvoláva. */
function installObserver(locales: readonly Locale[]): void {
  const target = window as TapWindow;
  if (target.__svaplyLanguageTapV1) return;
  const state: TapState = { events: [], dropped: 0 };
  target.__svaplyLanguageTapV1 = state;
  const record = (event: Event, phase: Phase): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    const main = button?.closest('[data-dashboard-main]');
    const panel = button?.closest('div.block.lg\\:hidden');
    if (!button || !main || !panel || !main.contains(panel)) return;
    const buttons = Array.from(panel.querySelectorAll('button'));
    const index = buttons.indexOf(button);
    if (buttons.length !== 6 || index < 0) return;
    if (state.events.length >= 80) { state.dropped += 1; return; }
    let stored: StoredLocale = 'other';
    try {
      const value = localStorage.getItem('appLocale');
      if (locales.includes(value as Locale)) stored = value as Locale;
    } catch { /* Nedostupný storage nie je dôvodom meniť gesto. */ }
    state.events.push({
      phase, kind: event.type as Kind, choice: locales[index], stored,
      prevented: event.defaultPrevented, trusted: event.isTrusted,
      atMs: Math.max(0, Math.round(performance.now())),
    });
  };
  for (const kind of ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click']) {
    document.addEventListener(kind, (event) => record(event, 'capture'), { capture: true, passive: true });
    document.addEventListener(kind, (event) => record(event, 'bubble'), { passive: true });
  }
}

/** Porovná iba pevné preklady; žiadny text ani atribút stránky sa nevracia do Node. */
function readSnapshot({ locales, backLabels }: { locales: readonly Locale[]; backLabels: BackLabels }): unknown {
  const state = (window as TapWindow).__svaplyLanguageTapV1;
  if (!state) return null;
  let stored: StoredLocale = 'other';
  try {
    const value = localStorage.getItem('appLocale');
    if (locales.includes(value as Locale)) stored = value as Locale;
  } catch { /* Diagnostika ostane dostupná aj bez localStorage. */ }
  const main = document.querySelector('[data-dashboard-main]');
  const panel = main?.querySelector('div.block.lg\\:hidden');
  const buttons = Array.from(panel?.querySelectorAll('button') ?? []);
  const selected = buttons.length === 6
    ? buttons.flatMap((button, index) => button.querySelector('svg') ? [locales[index]] : []) : [];
  const header = Array.from(document.querySelectorAll('div.fixed.top-0.left-0.right-0'))
    .find((element) => element.querySelector('div.grid.h-12'));
  const backMatchesStored = stored === 'other' ? null
    : Array.from(header?.querySelectorAll('button') ?? [])
      .filter((button) => button.getAttribute('aria-label') === backLabels[stored]).length;
  return { stored, selected, backMatchesStored, events: state.events, dropped: state.dropped };
}

/** Vypíše len enumy, booleany, počty a časy; neznáme hodnoty zahodí. */
export function formatLanguageTapEvidence(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '[E2E-TAP] snapshot=unavailable';
  const snapshot = value as Record<string, unknown>;
  const locale = (item: unknown): item is Locale => LOCALES.includes(item as Locale);
  const stored = (item: unknown): item is StoredLocale => item === 'other' || locale(item);
  const count = (item: unknown): item is number => Number.isSafeInteger(item) && Number(item) >= 0;
  if (!stored(snapshot.stored) || !Array.isArray(snapshot.selected)
    || snapshot.selected.length > 6 || !snapshot.selected.every(locale)
    || !Array.isArray(snapshot.events) || !count(snapshot.dropped)
    || !(snapshot.backMatchesStored === null || (count(snapshot.backMatchesStored) && snapshot.backMatchesStored <= 10))) {
    return '[E2E-TAP] snapshot=unavailable';
  }
  const events = snapshot.events.slice(0, 80).filter((item): item is TapEvent => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const event = item as Record<string, unknown>;
    return (event.phase === 'capture' || event.phase === 'bubble') && KINDS.includes(event.kind as Kind)
      && locale(event.choice) && stored(event.stored) && typeof event.prevented === 'boolean'
      && typeof event.trusted === 'boolean' && count(event.atMs);
  });
  const dropped = snapshot.dropped + snapshot.events.length - events.length;
  const lines = [
    `[E2E-TAP] snapshot=available stored=${snapshot.stored} selected=${snapshot.selected.join(',') || 'none'}`
      + ` backMatchesStored=${snapshot.backMatchesStored ?? 'n/a'} events=${events.length} dropped=${dropped}`,
  ];
  for (const event of events) {
    lines.push(`[E2E-TAP] phase=${event.phase} kind=${event.kind} choice=${event.choice} stored=${event.stored}`
      + ` prevented=${event.prevented} trusted=${event.trusted} atMs=${event.atMs}`);
  }
  return lines.join('\n');
}

/** Pridá iba pasívne pozorovanie pred navigáciou; snímka sa číta až po pôvodných aserciách. */
export async function observeLanguageTaps(
  page: Page, testInfo: Pick<TestInfo, 'attach'>, backLabels: BackLabels,
): Promise<(moment?: TapMoment) => Promise<void>> {
  const installed = await captureWithin(() => page.addInitScript(installObserver, LOCALES).then(() => true), 1000);
  return async (moment: TapMoment = 'finally') => {
    const snapshot = installed
      ? await captureWithin(() => page.evaluate(readSnapshot, { locales: LOCALES, backLabels }), 1000) : null;
    const safeMoment = moment === 'before-reload' ? 'before-reload' : 'finally';
    const body = `[E2E-TAP] moment=${safeMoment}\n${formatLanguageTapEvidence(snapshot)}`;
    console.log(body);
    await captureWithin(() => testInfo.attach('language-tap-evidence', {
      body: Buffer.from(body), contentType: 'text/plain',
    }), 1000);
  };
}
