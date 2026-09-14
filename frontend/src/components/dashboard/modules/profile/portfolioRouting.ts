export function getPortfolioOwnerIdentifier(
  ownerUserId?: number,
  ownerSlug?: string | null,
): string | null {
  const slug = String(ownerSlug || '').trim();
  if (slug) return slug;
  if (typeof ownerUserId === 'number' && Number.isInteger(ownerUserId) && ownerUserId > 0) {
    return String(ownerUserId);
  }
  return null;
}

export function buildPortfolioListPath(ownerIdentifier: string): string {
  return `/dashboard/users/${encodeURIComponent(ownerIdentifier)}/portfolio`;
}

export function buildPortfolioDetailPath(
  ownerIdentifier: string,
  portfolioItemId: number,
): string {
  return `${buildPortfolioListPath(ownerIdentifier)}/${portfolioItemId}`;
}

export function buildPortfolioCreatePath(ownerIdentifier: string): string {
  return `${buildPortfolioListPath(ownerIdentifier)}/create`;
}

/** Kam vedie „späť" z detailu portfólia – cieľ aj modul, ktorý mu zodpovedá. */
export function portfolioDetailBackTarget(
  ownerIdentifier: string | null | undefined,
): { target: string; module: 'user-profile' | 'profile' } {
  const identifier = String(ownerIdentifier || '').trim();
  return identifier
    ? { target: buildPortfolioListPath(identifier), module: 'user-profile' }
    : { target: '/dashboard/profile', module: 'profile' };
}

/** Router s toľkým, koľko návrat z detailu portfólia potrebuje. */
export type PortfolioBackRouter = { replace: (url: string) => void };

/**
 * Vykonaj návrat z detailu portfólia.
 *
 * `replace`, NIE `push` a NIE `back()`:
 *
 *  - `push` (pôvodné správanie) pridal nový záznam, takže prehliadačové Back
 *    viedlo SPÄŤ NA POLOŽKU a appkové „späť" ju znova prekrylo profilom –
 *    používateľ medzi nimi len oscilovala a von sa nedostal.
 *  - `back()` by síce záznam nepridal a `activeModule` by sa doladil sám
 *    (`syncModuleFromPath` počúva `popstate`), ale cieľ NEGARANTUJE: na detail
 *    položky sa dá prísť aj priamym odkazom, po F5 alebo klikom na zdieľanú
 *    kartu vo feede. Predchádzajúci záznam vtedy nie je zoznam portfólia –
 *    býva to feed alebo dokonca stránka mimo appky.
 *  - `replace` dá oboje: cieľ je vždy zoznam vlastníka a história nerastie,
 *    takže slučka nemá z čoho vzniknúť.
 */
export function navigateBackFromPortfolioDetail(
  router: PortfolioBackRouter,
  target: string,
): void {
  router.replace(target);
}

/**
 * Pôvod detailu portfólia – odkiaľ ho otvorila appka.
 *
 * `replace` vyššie má jednu slabinu: keď appka položku otvorila sama (zo
 * záložky Portfólio, zo zdieľanej karty na Nástenke), prepíše jej záznam
 * INOU adresou toho istého stavu a v histórii ostanú dva rovnaké kroky.
 * Pri známom pôvode je preto správny skutočný krok späť. `replace` ostáva pre
 * vstup bez pôvodu (odkaz, F5), kde predošlý záznam nemusí patriť appke.
 *
 * Pôvod sa píše do `history.state` záznamu položky – rovnaký vzor ako
 * `__svaplyDesktopSettingsOrigin`. Dvojkrokovo, lebo záznam vytvára až Next
 * router pri commite novej stránky: otvorenie si cestu zapamätá a detail ju
 * po zobrazení prevezme.
 */
const ORIGIN_HISTORY_KEY = '__svaplyPortfolioDetailOrigin';

/**
 * Identita tohto načítania stránky.
 *
 * `history.state` prežije F5, pôvod však nie: po reloade appka stav, z ktorého
 * sa položka otvorila, nepozná. Marker z iného načítania preto neplatí.
 */
const PAGE_LOAD_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type PortfolioDetailOriginMarker = { version: 1; pageLoadId: string };

/** Cesta položky, ktorú appka práve otvára a ešte nemá svoj záznam. */
let pendingDetailPath: string | null = null;

function historyStateRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Otvor položku z appky (profil, Nástenka) – s pôvodom pre krok späť. */
export function openPortfolioDetail(
  router: { push: (url: string) => void },
  ownerIdentifier: string,
  portfolioItemId: number,
): void {
  const path = buildPortfolioDetailPath(ownerIdentifier, portfolioItemId);
  pendingDetailPath = path;
  router.push(path);
}

/**
 * Detail sa zobrazil: ak ho otvorila appka, označí jeho záznam pôvodom.
 *
 * Prevzatie je jednorazové a zahodí sa aj pri nezhode – inak by si ho mohol
 * neskôr privlastniť detail otvorený odkazom.
 */
export function adoptPortfolioDetailOrigin(): void {
  if (typeof window === 'undefined') return;
  const path = pendingDetailPath;
  pendingDetailPath = null;
  if (!path || window.location.pathname !== path) return;
  try {
    window.history.replaceState(
      {
        ...historyStateRecord(window.history.state),
        [ORIGIN_HISTORY_KEY]: {
          version: 1,
          pageLoadId: PAGE_LOAD_ID,
        } satisfies PortfolioDetailOriginMarker,
      },
      '',
      window.location.href,
    );
  } catch {
    // Bez markera sa návrat správa ako pri vstupe odkazom (replace na zoznam).
  }
}

/**
 * Krok späť na pôvod detailu, keď je známy.
 *
 * Vracia `false`, keď pôvod známy nie je – volajúci ostáva pri `replace`.
 */
export function returnToPortfolioDetailOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const marker = historyStateRecord(window.history.state)[ORIGIN_HISTORY_KEY] as
    | Partial<PortfolioDetailOriginMarker>
    | undefined;
  if (marker?.version !== 1 || marker.pageLoadId !== PAGE_LOAD_ID) return false;
  window.history.back();
  return true;
}

/** Len pre testy – vyčistí modulový stav medzi prípadmi. */
export function resetPortfolioDetailOrigin(): void {
  pendingDetailPath = null;
}
