'use client';

/**
 * Načítanie profilu cudzieho používateľa pre `SearchUserProfileModule`: profil, stav načítavania a
 * chyba, cache profilu a ponúk, zabudnutie profilu na klientovi a kanonizácia číselného ID v adrese
 * na slug.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import type { User } from '@/types';
import {
  getUserProfileFromCache,
  invalidateUserProfileCache,
  setUserProfileToCache,
} from '../profile/profileUserCache';
import { invalidateOffersCache } from '../profile/profileOffersCache';
import { invalidateSearchCacheForUser } from './hooks/useSearchApi';
import { removeUserFromRecentSearches } from './recentSearchStorage';
import type { SearchProfileApiError } from './foreignProfileHelpers';

export function useForeignProfileData(userId: number, currentUserId: number) {
  const router = useRouter();
  const { t } = useLanguage();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const removeTargetFromClientState = useCallback(() => {
    invalidateUserProfileCache(userId);
    invalidateOffersCache(userId);
    invalidateSearchCacheForUser(userId);
    removeUserFromRecentSearches(currentUserId, userId);
  }, [currentUserId, userId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      // Invalidovať cache ponúk pre cudzí profil, aby sa načítali čerstvé dáta
      // vrátane filtrovania skrytých kariet.
      // Toto zabezpečí, že skryté karty sa nezobrazia v profile iného používateľa.
      invalidateOffersCache(userId);

      // Najprv skús cache profilu pre rýchle zobrazenie, ale vždy dotiahni
      // čerstvé dáta z API. Inak sa po zmene súkromia (napr.
      // contact_email_visible) môže profil javiť "zaseknutý" až do vypršania TTL.
      const cached = getUserProfileFromCache(userId);
      if (cached && !cancelled) {
        setProfileUser(cached);
        setIsLoading(false);
      }

      try {
        const { data } = await api.get<User>(endpoints.dashboard.userProfile(userId));

        if (cancelled) return;

        setProfileUser(data);
        setUserProfileToCache(userId, data);

        // Ak má používateľ slug a URL má ID namiesto slugu, aktualizovať URL.
        if (data.slug) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          if (currentPath.startsWith('/dashboard/users/')) {
            const currentIdentifier = currentPath.replace('/dashboard/users/', '').split('/')[0];
            // Ak je aktuálny identifikátor číslo (ID) a máme slug, aktualizovať URL.
            if (/^\d+$/.test(currentIdentifier) && currentIdentifier !== data.slug) {
              // Query aj fragment idú so sebou. Kanonizácia mení IBA
              // identifikátor v ceste – všetko ostatné patrí stránke, na ktorú
              // sa práve pozeráme: `?tab=` (aktívna záložka), `?offer=`
              // a `?highlight=` (preklik na konkrétnu ponuku). Bez toho ich
              // toto presmerovanie ticho zahodilo.
              const search = typeof window !== 'undefined' ? window.location.search : '';
              const hash = typeof window !== 'undefined' ? window.location.hash : '';
              const newUrl = `/dashboard/users/${data.slug}${search}${hash}`;

              // `replace`, nie `push`: kanonizácia je TÁ ISTÁ stránka s iným
              // tvarom identifikátora, nie nový krok. Push tu pridával dva
              // záznamy naraz (priamy zápis + router), takže cudzí profil mal
              // v histórii duplicitný krok navyše oproti vlastnému – ten sa
              // kanonizuje jediným `replaceState`.
              if (typeof window !== 'undefined') {
                // Stav záznamu sa PONECHÁVA: kanonizácia mení len tvar adresy,
                // nie samotný záznam. Nesie si štítky, ktoré k nemu patria –
                // najmä pôvod profilu pre appkovú šípku. `null` ich zmazal a
                // keďže identita sa kanonizáciou nemení, už sa nenastavili.
                window.history.replaceState(window.history.state, '', newUrl);
              }
              router.replace(newUrl);
            }
          }
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const apiError = error as SearchProfileApiError;
        const status = apiError.response?.status;
        if (status === 404) {
          removeTargetFromClientState();
          setProfileUser(null);
        }
        const msg =
          status === 404
            ? t('search.userProfileNotFound', 'Profil používateľa sa nepodarilo načítať.')
            : status === 429
            ? t(
                "search.userProfileRateLimited",
                "Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.",
              )
            : apiError.response?.data?.error ||
              apiError.response?.data?.detail ||
              apiError.message ||
              t("search.userProfileLoadError", "Nepodarilo sa načítať profil používateľa.");
        setError(msg);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // Zámerne neuvádzame t v závislostiach, aby sa pri zmene jazyka nespúšťal
    // nový network request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeTargetFromClientState, userId]);

  return { profileUser, setProfileUser, isLoading, error, removeTargetFromClientState };
}
