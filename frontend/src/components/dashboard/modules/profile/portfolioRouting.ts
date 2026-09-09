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
