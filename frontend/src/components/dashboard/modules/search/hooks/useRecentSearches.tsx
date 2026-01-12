"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { type User } from '@/types';
import { type SearchResults, type SearchUserResult } from '../types';
import { getUserProfileFromCache } from '../../profile/profileUserCache';
import { type SearchStateProps } from './useSearchState';

export interface RecentSearchesProps {
  recentSearches: SearchResults[];
  handleRecentResultClick: (result: SearchResults) => void;
}

interface UseRecentSearchesParams {
  user: User;
  searchState: SearchStateProps;
}

/**
 * Custom hook pre spravovanie posledných vyhľadávaní
 */
export function useRecentSearches({ user, searchState }: UseRecentSearchesParams): RecentSearchesProps {
  const { t } = useLanguage();
  const [recentSearches, setRecentSearches] = useState<SearchResults[]>([]);
  
  const { 
    setResults, 
    setHasSearched, 
    setIsFromRecentSearch, 
    setError 
  } = searchState;

  // Načítať posledné vyhľadávania (výsledky) z localStorage pri mounte
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('searchRecentResults');
      if (stored) {
        const searches = JSON.parse(stored) as SearchResults[];
        // Obmedziť na 20 posledných (história) – zobrazovať budeme max 5
        const limited = searches.slice(0, 20);
        setRecentSearches(limited);
      }
    } catch (error) {
      // Ignorovať chyby pri parsovaní
    }
  }, []);

  // Aktualizovať mená v histórii vyhľadávania, ak sa zmení profil aktuálneho používateľa
  // Alebo ak máme novšie dáta v userProfileCache (pre cudzích používateľov)
  useEffect(() => {
    if (!user) return;
    if (recentSearches.length === 0) return;

    setRecentSearches((prev) => {
      let hasChanges = false;
      const newSearches = prev.map((result) => {
        let resultChanged = false;

        // Aktualizácia users
        const newUsers = result.users?.map((u) => {
          // 1. Kontrola či je to aktuálny používateľ
          if (u.id === user.id) {
            const newName =
              user.user_type === 'individual'
                ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
                : user.company_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username;

            if (u.display_name !== newName || u.slug !== user.slug) {
              hasChanges = true;
              resultChanged = true;
              return { ...u, display_name: newName, slug: user.slug };
            }
          } 
          // 2. Kontrola či máme novšie dáta v cache (pre cudzích používateľov)
          else {
            const cachedUser = getUserProfileFromCache(u.id);
            if (cachedUser) {
              const newName =
                cachedUser.user_type === 'individual'
                  ? [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username
                  : cachedUser.company_name || [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username;
              
              if (u.display_name !== newName || u.slug !== cachedUser.slug) {
                hasChanges = true;
                resultChanged = true;
                return { ...u, display_name: newName, slug: cachedUser.slug };
              }
            }
          }
          return u;
        });

        // Aktualizácia skills (ak obsahujú user_display_name)
        const newSkills = result.skills?.map((s) => {
          // 1. Kontrola či je to aktuálny používateľ
          if (s.user_id === user.id) {
            const newName =
              user.user_type === 'individual'
                ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
                : user.company_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username;

            const currentName = (s as any).user_display_name;
            if (currentName && currentName !== newName) {
              hasChanges = true;
              resultChanged = true;
              return { ...s, user_display_name: newName };
            }
          }
          // 2. Kontrola či máme novšie dáta v cache
          else if (s.user_id) {
             const cachedUser = getUserProfileFromCache(s.user_id);
             if (cachedUser) {
               const newName =
                cachedUser.user_type === 'individual'
                  ? [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username
                  : cachedUser.company_name || [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username;
               
               const currentName = (s as any).user_display_name;
               if (currentName && currentName !== newName) {
                 hasChanges = true;
                 resultChanged = true;
                 return { ...s, user_display_name: newName };
               }
             }
          }
          return s;
        });

        if (resultChanged) {
          return {
            ...result,
            users: newUsers || result.users,
            skills: newSkills || result.skills,
          };
        }
        return result;
      });

      if (hasChanges) {
        localStorage.setItem('searchRecentResults', JSON.stringify(newSearches));
        return newSearches;
      }
      return prev;
    });
  }, [user, recentSearches]);

  // Zobraziť výsledok z histórie
  const handleRecentResultClick = useCallback((result: SearchResults) => {
    // Vytvoriť kópiu výsledkov pre aktualizáciu
    const updatedResult = { ...result };

    // Aktualizovať používateľov v results podľa aktuálneho usera alebo cache
    if (updatedResult.users && updatedResult.users.length > 0) {
      updatedResult.users = updatedResult.users.map(u => {
        // 1. Ak je to aktuálny používateľ, použi jeho aktuálne dáta
        if (user && u.id === user.id) {
          const newName =
            user.user_type === 'individual'
              ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username
              : user.company_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username;
          
          if (u.display_name !== newName || u.slug !== user.slug) {
            return { ...u, display_name: newName, slug: user.slug };
          }
        } 
        // 2. Ak je to iný používateľ, skús pozrieť do cache
        else {
          const cachedUser = getUserProfileFromCache(u.id);
          if (cachedUser) {
            const newName =
              cachedUser.user_type === 'individual'
                ? [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username
                : cachedUser.company_name || [cachedUser.first_name, cachedUser.last_name].filter(Boolean).join(' ').trim() || cachedUser.username;
            
            if (u.display_name !== newName || u.slug !== cachedUser.slug) {
              return { ...u, display_name: newName, slug: cachedUser.slug };
            }
          }
        }
        return u;
      });
    }

    setResults(updatedResult);
    setHasSearched(true);
    setIsFromRecentSearch(true);
    setError(null);

    // Spustiť asynchrónnu aktualizáciu dát na pozadí pre istotu
    if (updatedResult.users && updatedResult.users.length > 0) {
      updatedResult.users.forEach(async (u) => {
        // Preskočiť ak to som ja (už aktualizované vyššie)
        if (user && u.id === user.id) return;
        
        try {
          const response = await api.get(endpoints.dashboard.userProfile(u.id));
          const freshUser = response.data;
          
          // Ak sme dostali čerstvé dáta, aktualizujeme UI ak sa niečo zmenilo
          if (freshUser) {
             const freshName =
              freshUser.user_type === 'individual'
                ? [freshUser.first_name, freshUser.last_name].filter(Boolean).join(' ').trim() || freshUser.username
                : freshUser.company_name || [freshUser.first_name, freshUser.last_name].filter(Boolean).join(' ').trim() || freshUser.username;
             
             // Ak sa líši meno alebo slug, aktualizuj results state
             if (freshUser.slug !== u.slug || freshName !== u.display_name) {
               setResults((currentResults) => {
                 if (!currentResults) return null;
                 const newUsers = currentResults.users.map(currU => {
                   if (currU.id === freshUser.id) {
                     return { ...currU, display_name: freshName, slug: freshUser.slug };
                   }
                   return currU;
                 });
                 return { ...currentResults, users: newUsers };
               });

               // A tiež aktualizuj v histórii localStorage
               setRecentSearches((prev) => {
                 const newSearches = prev.map(search => {
                   const searchUsers = search.users.map(searchU => {
                     if (searchU.id === freshUser.id) {
                       return { ...searchU, display_name: freshName, slug: freshUser.slug };
                     }
                     return searchU;
                   });
                   return { ...search, users: searchUsers };
                 });
                 localStorage.setItem('searchRecentResults', JSON.stringify(newSearches));
                 return newSearches;
               });
             }
          }
        } catch (err) {
          // Ticho ignorovať chyby pri refreshovaní dát na pozadí
        }
      });
    }
  }, [user, setResults, setHasSearched, setIsFromRecentSearch, setError, setRecentSearches]);

  return {
    recentSearches,
    handleRecentResultClick,
  };
}
