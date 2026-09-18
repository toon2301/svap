'use client';

/**
 * Prišiel som do Nastavení z appky, alebo rovno odkazom?
 *
 * Zoznam Nastavení aj jeho sekcie sú na mobile obrazovky s vlastným záznamom,
 * takže návrat je krok späť. To ale platí len vtedy, keď pod nimi nejaký
 * záznam JE. Pri priamom vstupe (odkaz, nová karta, F5) by bezpodmienečný
 * `history.back()` odišiel z appky alebo neurobil nič.
 *
 * Preto si záznam, ktorý vznikol navigáciou vnútri appky, nesie štítok. Je to
 * ten istý vzor ako `__svaplyDesktopSettingsOrigin` či pôvod detailu portfólia:
 * poznáme pôvod → skutočný krok späť, nepoznáme → deterministický cieľ.
 */

const HISTORY_KEY = '__svaplyMobileSettingsOrigin';

/**
 * Identita tohto načítania stránky.
 *
 * `history.state` prežije F5, ale záznamy spred reloadu appka preskočiť nevie,
 * takže štítok z iného načítania neplatí a použije sa fallback.
 */
const PAGE_LOAD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type MobileSettingsOriginMarker = { version: 1; pageLoadId: string };

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Stav pre záznam, pod ktorým už nejaká obrazovka appky je. */
export function withMobileSettingsOrigin(historyState: unknown): Record<string, unknown> {
  return {
    ...historyStateRecord(historyState),
    [HISTORY_KEY]: {
      version: 1,
      pageLoadId: PAGE_LOAD_ID,
    } satisfies MobileSettingsOriginMarker,
  };
}

/** Má tento záznam pod sebou obrazovku, na ktorú sa dá vrátiť krokom späť? */
export function hasMobileSettingsOrigin(historyState: unknown): boolean {
  const marker = historyStateRecord(historyState)[HISTORY_KEY] as
    | Partial<MobileSettingsOriginMarker>
    | undefined;
  return marker?.version === 1 && marker.pageLoadId === PAGE_LOAD_ID;
}

/**
 * Odchod z obrazovky Nastavení krokom späť, ak je kam.
 *
 * Vracia `false`, keď pod obrazovkou žiadny záznam appky nie je (priamy vstup
 * odkazom, nová karta, záznam spred F5) – volajúci vtedy prejde na svoj
 * deterministický cieľ namiesto toho, aby krokom späť odišiel z appky.
 */
export function stepBackFromMobileSettings(): boolean {
  if (typeof window === 'undefined') return false;
  if (!hasMobileSettingsOrigin(window.history.state)) return false;
  window.history.back();
  return true;
}
