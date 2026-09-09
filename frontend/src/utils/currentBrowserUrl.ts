/**
 * Aktuálna adresa prehliadača ako jeden reťazec: cesta + query + fragment.
 *
 * Dashboard si na dvoch miestach pamätá, KAM sa vrátiť po zatvorení nastavení
 * (mobilná aj desktopová vetva). Obe si adresu skladali samy a mobilná pritom
 * na fragment zabúdala – jedna implementácia, aby sa nemali ako rozísť znovu.
 *
 * Zámerne bez `window.location.href`: uložená hodnota ide neskôr do
 * `history.pushState`, kde patrí adresa RELATÍVNA k originu, nie absolútna.
 *
 * `fallback` platí mimo prehliadača (SSR, testy bez DOM) – volajúci vie
 * najlepšie, kam má zmysel vrátiť sa, keď adresa k dispozícii nie je.
 */
export function currentBrowserUrl(fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}
