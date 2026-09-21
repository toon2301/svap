'use client';

/**
 * Otvorenie profilu z vyhľadávania – jedno miesto pre obe vyhľadávania.
 *
 * Appka ich má dve: panel vnútri dashboardu a samostatnú stránku `/search`
 * (chodí sa na ňu cez „zobraziť všetky výsledky"). Stránka si držala vlastnú
 * kópiu tejto navigácie, takže keď dashboardová vetva dostala značenie pôvodu
 * pre appkovú šípku, na stránku sa nedostalo – profil otvorený odtiaľ pôvod
 * nemal a šípka namiesto opustenia profilu len prepla záložku.
 *
 * Zdieľa sa presne to, čo bolo duplicitné: zloženie adresy a označenie pôvodu.
 * Zvyšok dashboardovej vetvy (cache, stav zobrazovaného používateľa) je jej
 * vnútorná vec a na stránke `/search` by nedávala zmysel.
 */

import { dashboardProfilePath } from '../../components/dashboardRoutes';
import { markProfileOriginPending } from './profileOriginHistory';

type ProfileRouter = { push: (url: string) => void };

export type OpenUserProfileOptions = {
  /** Ponuka, na ktorú sa má profil po otvorení zvýrazniť. */
  highlightSkillId?: number | null;
};

/** Identifikátor pre adresu profilu: slug, inak číselné ID. */
export function profileIdentifierFor(
  userId: number,
  slug?: string | null,
): string {
  const trimmed = String(slug ?? '').trim();
  return trimmed || String(userId);
}

/**
 * Prejde na profil a označí jeho záznam pôvodom.
 *
 * Pôvod sa značí CESTOU bez query: prevzatie po príchode porovnáva
 * `window.location.pathname`, takže s parametrom zvýraznenia by sa nikdy
 * netrafilo.
 */
export function openUserProfileFromSearch(
  router: ProfileRouter,
  identifier: string,
  options: OpenUserProfileOptions = {},
): void {
  // Bez identifikátora by vznikla rozbitá adresa `/dashboard/users/` –
  // nenavigovať je menšie zlo než tam používateľa poslať.
  if (!identifier.trim()) return;

  const path = dashboardProfilePath(identifier);
  if (!path) return;

  markProfileOriginPending(path);

  const { highlightSkillId } = options;
  router.push(
    highlightSkillId == null
      ? path
      : `${path}?highlight=${encodeURIComponent(String(highlightSkillId))}`,
  );
}
