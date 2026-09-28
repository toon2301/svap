'use client';

import { api, endpoints } from '@/lib/api';
import type { User } from '@/types';
import { getUserIdBySlug, setUserProfileToCache } from '../modules/profile/profileUserCache';

/**
 * Preklad slug → ID pre zobrazenie profilu (`user-profile`).
 *
 * JEDINÉ miesto, ktoré na to smie ísť na sieť. Handler `goToUserProfile` ho
 * kedysi duplikoval vlastným fetchom bez zrušenia – na jeden vstup tak bežali
 * dva requesty a neskorá odpoveď zo staršieho vstupu prepísala profil
 * novšieho (na adrese vlastného profilu sa ukázal cudzí).
 *
 * Každý beh má vlastný `AbortController`: zrušenie (nový vstup, odchod
 * z profilu, nový pokus) request preruší a jeho výsledok sa už nikam
 * nezapíše. Beh končí vždy jedným z troch výsledkov – profil, „neexistuje"
 * (404) alebo chyba (sieť, 5xx, 429, timeout). Kedysi každá chyba okrem 404
 * nechala „Načítavam profil..." bežať navždy; aj request, ktorý neodpovie
 * vôbec (napr. čaká na obnovu session), sa po limite ukončí ako chyba.
 */
export const VIEWED_USER_RESOLVE_TIMEOUT_MS = 30_000;

export type ProfileFetchResult =
  | { status: 'ok'; data: User }
  | { status: 'not_found' }
  | { status: 'failed' }
  | { status: 'cancelled' };

/** GET profilu, ktorý nikdy nevyhodí – chybu vráti ako výsledok. */
export async function fetchUserProfile(url: string, signal: AbortSignal): Promise<ProfileFetchResult> {
  try {
    const { data } = await api.get<User>(url, { signal });
    return signal.aborted ? { status: 'cancelled' } : { status: 'ok', data };
  } catch (error: unknown) {
    if (signal.aborted) return { status: 'cancelled' };
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status === 404 ? { status: 'not_found' } : { status: 'failed' };
  }
}

type ResolutionHandlers = {
  onResolved: (userId: number) => void;
  onNotFound: () => void;
  onFailed: () => void;
};

/**
 * Spustí preklad slug → ID (najprv cache, inak API + zápis do cache).
 *
 * Vracia zrušenie – volá ho cleanup efektu pri KAŽDOM konci behu. Po ňom sa
 * už nezavolá žiadny handler, ani keď odpoveď medzitým dorazí.
 */
export function startViewedUserResolution(
  slug: string,
  handlers: ResolutionHandlers,
  timeoutMs: number = VIEWED_USER_RESOLVE_TIMEOUT_MS,
): () => void {
  const cachedId = getUserIdBySlug(slug);
  if (cachedId) {
    handlers.onResolved(cachedId);
    return () => {};
  }

  const controller = new AbortController();
  let settled = false;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  const settle = (report: () => void) => {
    if (settled) return;
    settled = true;
    if (deadline !== null) clearTimeout(deadline);
    report();
  };

  deadline = setTimeout(() => {
    settle(handlers.onFailed);
    controller.abort();
  }, timeoutMs);

  void fetchUserProfile(endpoints.dashboard.userProfileBySlug(slug), controller.signal).then((result) => {
    if (result.status === 'cancelled') return;
    if (result.status === 'ok') {
      settle(() => {
        setUserProfileToCache(result.data.id, result.data);
        handlers.onResolved(result.data.id);
      });
      return;
    }
    settle(result.status === 'not_found' ? handlers.onNotFound : handlers.onFailed);
  });

  return () => {
    settled = true;
    if (deadline !== null) clearTimeout(deadline);
    controller.abort();
  };
}
