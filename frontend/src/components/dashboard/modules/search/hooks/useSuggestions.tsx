"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { type User } from '@/types/user';
import { type SearchSkill } from '../types';
import { type SearchStateProps } from './useSearchState';

export interface SuggestionsProps {
  suggestedSkills: SearchSkill[];
  handleSuggestionClick: (skill: SearchSkill) => void;
}

interface UseSuggestionsParams {
  user: User;
  searchState: SearchStateProps;
  onSkillClick?: (userId: number, skillId: number, slug?: string | null) => void;
}

/**
 * Custom hook pre spravovanie návrhov pre používateľa
 */
export function useSuggestions({ user, searchState, onSkillClick }: UseSuggestionsParams): SuggestionsProps {
  const [suggestedSkills, setSuggestedSkills] = useState<SearchSkill[]>([]);
  
  // Cache pre návrhy (suggestedSkills) – kľúč je ID aktuálneho používateľa
  const suggestionsCacheRef = useRef<SearchSkill[] | null>(null);
  
  const { setResults, setHasSearched, setIsFromRecentSearch, setError } = searchState;

  // Načítať návrhy pre používateľa (z kariet v jeho lokalite)
  // OPRAVA: Použiť user?.id namiesto celého user objektu, aby sa zabránilo nekonečnej slučke
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        // Ak už máme návrhy v cache pre aktuálneho používateľa, použi ich
        if (suggestionsCacheRef.current) {
          setSuggestedSkills(suggestionsCacheRef.current);
          return;
        }

        const response = await api.get(endpoints.dashboard.search, {
          params: {
            q: '',
            location: '',
            offer_type: '',
            only_my_location: '1',
            price_min: '',
            price_max: '',
            page: 1,
            per_page: 50,
          },
        });

        if (cancelled) return;

        const data = response.data || {};
        const allSkills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];

        if (!allSkills.length) {
          setSuggestedSkills([]);
          return;
        }

        // Pomocná funkcia na zistenie, či je karta používateľa prihláseného v systéme
        const isOwnSkill = (skill: SearchSkill) => {
          // 1) Preferujeme porovnanie podľa user_id (najspoľahlivejšie)
          if (typeof skill.user_id === 'number' && skill.user_id === user.id) {
            return true;
          }

          // 2) Fallback – porovnanie podľa mena, ak backend neposiela user_id
          const skillOwnerName = (skill as any).user_display_name as string | undefined;
          const currentDisplayName =
            (user as any).display_name ||
            [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
            user.username;

          if (
            skillOwnerName &&
            typeof skillOwnerName === 'string' &&
            currentDisplayName &&
            typeof currentDisplayName === 'string' &&
            skillOwnerName.trim().toLowerCase() === currentDisplayName.trim().toLowerCase()
          ) {
            return true;
          }

          return false;
        };

        // Filtrovať vlastné karty používateľa - nezobrazovať ich v návrhoch
        const skills = allSkills.filter((s) => !isOwnSkill(s));

        if (!skills.length) {
          setSuggestedSkills([]);
          return;
        }

        // Rozdeliť na vlastné karty a ostatných (pre matching logiku)
        const ownSkills = allSkills.filter((s) => isOwnSkill(s));
        const otherSkills = skills;

        // Normalizačná funkcia na porovnávanie názvov (bez diakritiky, lowercase)
        const normalizeTitle = (skill: SearchSkill) => {
          const title = (skill.subcategory || skill.category || '').trim().toLowerCase();
          return title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        };

        const ownNormalized = ownSkills.map((s) => ({
          title: normalizeTitle(s),
          isSeeking: s.is_seeking === true,
        }));

        const complementary: SearchSkill[] = [];
        const remaining: SearchSkill[] = [];

        for (const skill of otherSkills) {
          const titleNorm = normalizeTitle(skill);
          if (!titleNorm) {
            remaining.push(skill);
            continue;
          }

          let isComplementary = false;
          for (const own of ownNormalized) {
            // Protiklad „ponúkam" vs „hľadám"
            if ((skill.is_seeking === true) === own.isSeeking) {
              continue;
            }
            if (!own.title) continue;

            // Jednoduché porovnanie názvu – obsahuje/je obsahovaný
            if (
              titleNorm.includes(own.title) ||
              own.title.includes(titleNorm)
            ) {
              isComplementary = true;
              break;
            }
          }

          if (isComplementary) {
            complementary.push(skill);
          } else {
            remaining.push(skill);
          }
        }

        const ordered = [...complementary, ...remaining].slice(0, 10);
        setSuggestedSkills(ordered);
        suggestionsCacheRef.current = ordered;
      } catch (e) {
        if (!cancelled) {
          // Návrhy sú len bonus – chyby ticho ignorujeme
          // console.warn('Nepodarilo sa načítať návrhy pre používateľa', e);
          setSuggestedSkills([]);
        }
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Handler pre kliknutie na návrh
  const handleSuggestionClick = useCallback((skill: SearchSkill) => {
    // Po kliknutí na návrh okamžite presmeruj na profil a zvýrazni kartu
    if (typeof onSkillClick === 'function') {
      const ownerId = skill.user_id ?? null;
      if (ownerId) {
        onSkillClick(ownerId, skill.id as number);
      }
    }
    
    // Nastavíme výsledky len na tento návrh (pre prípad, že sa užívateľ vráti)
    setResults({ skills: [skill], users: [] });
    setHasSearched(true);
    setIsFromRecentSearch(false);
    setError(null);
  }, [onSkillClick, setResults, setHasSearched, setIsFromRecentSearch, setError]);

  return {
    suggestedSkills,
    handleSuggestionClick,
  };
}
