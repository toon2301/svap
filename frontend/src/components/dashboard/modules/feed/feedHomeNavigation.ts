'use client';

/**
 * Žiadosť „prepni ma na Nástenku" z hĺbky stromu.
 *
 * PREČO NIE `router.push('/dashboard')`:
 *
 * Dashboard prepína moduly REACT STAVOM a adresu si prepisuje sám cez
 * `history.pushState` (viď `handleMainModuleChange`). Next router preto celý
 * čas ostáva na route `/dashboard` – aj keď je používateľ na profile a v
 * adrese má `/dashboard/users/<slug>`. `router.push('/dashboard')` teda mieri
 * na route, na ktorej podľa Next-u už sme: strom sa neodmountuje, `Dashboard`
 * si podrží stav a `activeModule` ostane `profile`. Navonok sa nestane nič –
 * presne to bolo vidieť pri zdieľaní ponuky z vlastného profilu.
 *
 * Prepnúť modul vie iba ten, kto ho drží. Appka na to má zavedený vzor:
 * globálny event, ktorý zachytí dashboard (`goToUserProfile`, `goToMyProfile`).
 * Toto je jeho obdoba pre Nástenku – `DashboardLayout` ju prepošle do
 * `onModuleChange('home')`, teda do TOHO ISTÉHO lievika, akým prepína bočné
 * menu (stav aj adresa naraz).
 */

export const FEED_HOME_NAVIGATION_EVENT = 'feed-go-home';

/** Prepni appku na Nástenku. Mimo dashboardu sa žiadosť ticho stratí. */
export function requestFeedHomeNavigation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event(FEED_HOME_NAVIGATION_EVENT));
  } catch {
    // Navigácia je pohodlie – príspevok je aj tak vytvorený.
  }
}

/** Dashboard počúva a prepne modul. */
export function onFeedHomeNavigation(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FEED_HOME_NAVIGATION_EVENT, handler);
  return () => window.removeEventListener(FEED_HOME_NAVIGATION_EVENT, handler);
}
