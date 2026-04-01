"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { type User } from '@/types';
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
  enabled?: boolean;
}

/**
 * Custom hook pre spravovanie navrhov pre pouzivatela bez zadaneho textu.
 * UI ostava rovnake, ale data uz chodia zo samostatneho backend endpointu.
 */
export function useSuggestions({
  user,
  searchState,
  onSkillClick,
  enabled = true,
}: UseSuggestionsParams): SuggestionsProps {
  const [suggestedSkills, setSuggestedSkills] = useState<SearchSkill[]>([]);

  // Cache je per-user, aby sa navrhy medzi pouzivatelmi nemiesali.
  const suggestionsCacheRef = useRef<Map<number, SearchSkill[]>>(new Map());

  const { setResults, setHasSearched, setIsFromRecentSearch, setError } = searchState;

  useEffect(() => {
    if (!enabled || !user?.id) return;

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const cachedSuggestions = suggestionsCacheRef.current.get(user.id);
        if (cachedSuggestions) {
          setSuggestedSkills(cachedSuggestions);
          return;
        }

        const response = await api.get(
          endpoints.dashboard.searchRecommendations ?? endpoints.dashboard.search,
          {
            params: { limit: 10 },
          },
        );

        if (cancelled) return;

        const data = response.data || {};
        const skills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];
        setSuggestedSkills(skills);
        suggestionsCacheRef.current.set(user.id, skills);
      } catch {
        if (!cancelled) {
          setSuggestedSkills([]);
        }
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [enabled, user?.id]);

  const handleSuggestionClick = useCallback(
    (skill: SearchSkill) => {
      if (typeof onSkillClick === 'function') {
        const ownerId = skill.user_id ?? null;
        const ownerSlug =
          typeof skill.owner_slug === 'string' && skill.owner_slug.trim()
            ? skill.owner_slug.trim()
            : null;
        if (ownerId) {
          onSkillClick(ownerId, skill.id as number, ownerSlug);
        }
      }

      setResults({ skills: [skill], users: [] });
      setHasSearched(true);
      setIsFromRecentSearch(false);
      setError(null);
    },
    [onSkillClick, setResults, setHasSearched, setIsFromRecentSearch, setError],
  );

  return {
    suggestedSkills,
    handleSuggestionClick,
  };
}
