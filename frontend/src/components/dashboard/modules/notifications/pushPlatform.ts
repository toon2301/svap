/**
 * Zisťovanie zariadenia pre výzvu na povolenie push upozornení (nález 321, etapa 3b). Na iPhone a iPade fungujú push
 * upozornenia len v aplikácii pridanej na plochu: Safari mimo nej `Notification` ani `PushManager` nezverejňuje (podľa
 * dokumentácie Apple), takže tlačidlo na vyžiadanie povolenia by tam nič neurobilo a používateľovi treba ukázať návod.
 * Obe funkcie sú bezpečné bez `window` (vykresľovanie na serveri) aj bez `matchMedia`.
 */

/** `navigator` s nepovinným príznakom `standalone`, ktorý nastavuje iba Safari na iOS. */
type NavigatorWithStandalone = Navigator & { standalone?: boolean };

/**
 * Zariadenie Apple s dotykovým displejom: iPhone, iPad alebo iPod podľa user agenta, alebo iPadOS, ktorý sa predvolene
 * hlási ako Mac (`navigator.platform` je `MacIntel`), no na rozdiel od Macu má dotykový displej (`maxTouchPoints` > 1).
 */
export function isAppleMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if (/iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
    return true;
  }

  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * Aplikácia je spustená ako nainštalovaná (pridaná na plochu), nie v karte prehliadača: Safari na iOS to hlási
 * príznakom `navigator.standalone`, ostatné prehliadače režimom zobrazenia `display-mode: standalone`. Chýbajúce alebo
 * zlyhané `matchMedia` znamená „nie“.
 */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if ((navigator as NavigatorWithStandalone).standalone === true) {
    return true;
  }

  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}
