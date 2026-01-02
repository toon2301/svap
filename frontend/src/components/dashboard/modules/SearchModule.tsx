"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type FormEvent,
} from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import {
  type SearchSkill,
  type SearchUserResult,
  type SearchResults,
  type SearchModuleProps,
} from './search/types';
import { getUserInitials } from './search/utils';
import { ScrollableText } from './search/ScrollableText';
import { FilterModal } from './search/FilterModal';

export default function SearchModule({ user }: SearchModuleProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [offerType, setOfferType] = useState<'all' | 'offer' | 'seeking'>('all');
  const [onlyMyLocation, setOnlyMyLocation] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [recentSearches, setRecentSearches] = useState<SearchResults[]>([]);
  const [suggestedSkills, setSuggestedSkills] = useState<SearchSkill[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  // Načítať návrhy pre používateľa (z kariet v jeho lokalite)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
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

        // Filtrovať vlastné karty používateľa - nezobrazovať ich v návrhoch
        const skills = allSkills.filter((s) => s.user_id !== user.id);

        if (!skills.length) {
          setSuggestedSkills([]);
          return;
        }

        // Rozdeliť na vlastné karty a ostatných (pre matching logiku)
        const ownSkills = allSkills.filter((s) => s.user_id === user.id);
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
            // Protiklad „ponúkam“ vs „hľadám“
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
  }, [user]);

  // Skryť FlipButton ikony v kartách keď je filter modal otvorený
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    if (isFilterOpen) {
      // Pridaj class na body aby sme mohli skryť FlipButton cez CSS
      document.body.classList.add('filter-modal-open');
    } else {
      document.body.classList.remove('filter-modal-open');
    }

    return () => {
      document.body.classList.remove('filter-modal-open');
    };
  }, [isFilterOpen]);

  // Klávesové skratky v SearchModule
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignoruj, ak používateľ píše do inputu, textarey alebo je v modale
      const target = event.target as HTMLElement;
      const isInputActive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('[role="dialog"]') !== null ||
        target.closest('[role="textbox"]') !== null;

      // Esc - zatvor filter modal ak je otvorený
      if (event.key === 'Escape' && isFilterOpen) {
        event.preventDefault();
        setIsFilterOpen(false);
        return;
      }

      // "/" - focus do search inputu (len ak nie je aktívny žiadny input a nie je filter modal)
      if (event.key === '/' && !isInputActive && !isFilterOpen) {
        // Skontroluj, či sme na desktop verzii (lg a vyššie)
        if (window.innerWidth >= 1024) {
          event.preventDefault();
          // Malé oneskorenie, aby sa zabezpečilo, že search panel je už otvorený
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 100);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  // Reset všetkých filtrov
  const resetFilters = () => {
    setShowSkills(true);
    setShowUsers(true);
    setOfferType('all');
    setOnlyMyLocation(false);
    setPriceMin('');
    setPriceMax('');
  };

  // Filtrované výsledky ponúk
  const filteredSkills = useMemo(() => {
    if (!results) return [];
    return results.skills;
  }, [results]);

  const handleSearch = async (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    const q = searchQuery.trim();

    if (!q) {
      setResults({ skills: [], users: [] });
      setError(null);
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await api.get(endpoints.dashboard.search, {
        params: {
          q,
          location: '',
          offer_type: offerType === 'all' ? '' : offerType,
          only_my_location: onlyMyLocation ? '1' : '',
          price_min: priceMin || '',
          price_max: priceMax || '',
        },
      });

      const data = response.data || {};
      const skills = Array.isArray(data.skills) ? (data.skills as SearchSkill[]) : [];
      const users = Array.isArray(data.users)
        ? (data.users as SearchUserResult[])
        : [];

      setResults({ skills, users });

      // Uložiť výsledky do histórie localStorage
      if (typeof window !== 'undefined' && (skills.length > 0 || users.length > 0)) {
        try {
          const stored = localStorage.getItem('searchRecentResults');
          let searches: SearchResults[] = stored ? JSON.parse(stored) : [];
          
          // Vytvoriť nový výsledok
          const newResult: SearchResults = { skills, users };
          
          // Odstrániť duplikáty - porovnať podľa ID výsledkov
          // Odstrániť staré výsledky, ktoré majú rovnaké skills a users (podľa ID)
          const removeDuplicates = (results: SearchResults[]): SearchResults[] => {
            const seen = new Set<string>();
            return results.filter((result) => {
              // Vytvoriť unikátny kľúč z ID skills a users
              const skillIds = result.skills.map(s => s.id).sort().join(',');
              const userIds = result.users.map(u => u.id).sort().join(',');
              const key = `${skillIds}|${userIds}`;
              
              if (seen.has(key)) {
                return false;
              }
              seen.add(key);
              return true;
            });
          };
          
          // Pridať nový výsledok na začiatok
          searches = removeDuplicates([newResult, ...searches]);
          
          // Obmedziť na 20 posledných
          searches = searches.slice(0, 20);
          
          // Uložiť späť
          localStorage.setItem('searchRecentResults', JSON.stringify(searches));
          setRecentSearches(searches);
        } catch (error) {
          // Ignorovať chyby pri ukladaní
        }
      }
    } catch (e: any) {
      console.error('Chyba pri vyhľadávaní:', e);
      const message =
        e?.response?.data?.error ||
        t('search.error', 'Chyba pri vyhľadávaní. Skúste to znova.');
      setError(message);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  // Zobraziť výsledok z histórie
  const handleRecentResultClick = (result: SearchResults) => {
    setResults(result);
    setHasSearched(true);
    setError(null);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleSearch();
    }
  };

  const hasResults =
    !!results && (filteredSkills.length > 0 || results.users.length > 0);

  const hasPanelResults =
    !!results &&
    ((showSkills && filteredSkills.length > 0) ||
      (showUsers && results.users.length > 0));

  // Dynamické vyhľadávanie – rýchle návrhy počas písania
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q || q.length < 2) {
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      void handleSearch();
    }, 400);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sekundárny panel vedľa ľavej navigácie */}
        <aside className="w-full lg:w-96 flex-shrink-0">
          <form
            onSubmit={handleSearch}
            className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 sm:pt-10 lg:pt-8"
          >
            <div className="space-y-4">
              {/* Vyhľadávacie pole + Filter */}
              <div className="space-y-2">
                <h3 className="hidden lg:block text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Hľadať
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Vyhľadávanie"
                      className="block w-full px-3 py-2.5 pr-9 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent text-sm"
                    />
                    {/* Ikona na vyčistenie vyhľadávacieho poľa */}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setResults(null);
                          setError(null);
                          setHasSearched(false);
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label={t('search.clearSearch', 'Vyčistiť vyhľadávanie')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                    {/* Progress indikátor pri načítaní */}
                    {isSearching && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 animate-progress-bar" />
                      </div>
                    )}
                  </div>
                  {/* Filter button - integrovaný vedľa poľa */}
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="flex-shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    aria-label={t('search.filter', 'Filter')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Výsledky priamo v search navigácii */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl px-3 py-2">
                  {error}
                </div>
              )}

              {/* Posledné vyhľadávania - zobraziť len ak ešte nebolo vyhľadané alebo je searchQuery prázdny */}
              {!hasSearched && !error && !searchQuery.trim() && recentSearches.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                    {t('search.recentSearches', 'Posledné vyhľadávania')}
                  </h4>
                  <div className="space-y-1">
                    {recentSearches.slice(0, 5).map((result, index) => {
                      // Zobraziť prvých pár výsledkov z každej histórie
                      const totalItems = (result.skills?.length || 0) + (result.users?.length || 0);
                      if (totalItems === 0) return null;

                      // Zobraziť prvý skill alebo user z výsledkov
                      const firstSkill = result.skills?.[0];
                      const firstUser = result.users?.[0];

                      return (
                        <button
                          key={`recent-${index}`}
                          type="button"
                          onClick={() => handleRecentResultClick(result)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-gray-400 flex-shrink-0"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                          <span className="truncate flex-1 text-gray-900 dark:text-white">
                            {firstSkill ? (
                              <>
                                <span className={firstSkill.is_seeking ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}>
                                  {firstSkill.is_seeking ? 'HĽADÁM' : 'PONÚKAM'}
                                </span>{' '}
                                {firstSkill.subcategory || firstSkill.category}
                              </>
                            ) : firstUser ? (
                              firstUser.display_name
                            ) : (
                              t('search.recentResult', 'Výsledok')
                            )}
                          </span>
                          {totalItems > 1 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              +{totalItems - 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Návrhy pre používateľa – zobrazia sa len keď nie je zadaný text */}
              {!error && !searchQuery.trim() && suggestedSkills.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1">
                    {t('search.suggestionsForYou', 'Návrhy pre vás')}
                  </h4>
                  <div className="space-y-1">
                    {suggestedSkills.map((skill) => {
                      const isSeeking = skill.is_seeking === true;
                      const title = skill.subcategory || skill.category;
                      const locationLabel =
                        skill.location ||
                        skill.district ||
                        t('search.noLocation', 'Bez lokality');
                      // Meno používateľa - v návrhoch už sú len cudzie karty, takže nie je potrebné kontrolovať "Vy"
                      const ownerName = (skill as any).user_display_name || '';

                      return (
                        <button
                          key={`suggest-${skill.id}`}
                          type="button"
                          onClick={() => {
                            // Po kliknutí na návrh nastavíme výsledky len na tento návrh
                            setResults({ skills: [skill], users: [] });
                            setHasSearched(true);
                            setError(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-start gap-3"
                        >
                          <div
                            className={`px-2 py-1.5 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${
                              isSeeking
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            }`}
                          >
                            <span className="text-[10px] font-semibold whitespace-nowrap">
                              {isSeeking
                                ? t('search.labelSeeking', 'HĽADÁM')
                                : t('search.labelOffer', 'PONÚKAM')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                              <ScrollableText text={title} />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {ownerName && <span>{ownerName}</span>}
                              {ownerName && locationLabel && <span>{' • '}</span>}
                              {locationLabel && <span>{locationLabel}</span>}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasSearched && !error && results && (
                <div className="mt-4 space-y-1">
                  {hasPanelResults ? (
                    <>
                      {showSkills &&
                        filteredSkills.map((skill) => {
                          const isSeeking = skill.is_seeking === true;
                          const locationLabel =
                            skill.location ||
                            skill.district ||
                            t('search.noLocation', 'Bez lokality');
                          // Zobraz "Vy" ak je to vlastná ponuka
                          const ownerName =
                            skill.user_id === user.id
                              ? t('search.you', 'Vy')
                              : (skill as any).user_display_name || '';
                          const skillTitle = skill.subcategory || skill.category;

                          // Formátovanie ceny podľa typu ponuky
                          const hasPrice = skill.price_from !== null && skill.price_from !== undefined;
                          const priceValue = hasPrice ? Number(skill.price_from) : null;
                          const priceCurrency = skill.price_currency || '€';
                          const priceLabel = hasPrice 
                            ? isSeeking
                              ? `${t('search.priceToShort', 'do')} ${priceValue!.toLocaleString('sk-SK')}${priceCurrency}`
                              : `${t('search.priceFromShort', 'od')} ${priceValue!.toLocaleString('sk-SK')}${priceCurrency}`
                            : null;

                          return (
                            <button
                              key={`skill-${skill.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 flex items-start gap-3"
                            >
                              <div
                                className={`px-2 py-1.5 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${
                                  isSeeking
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                }`}
                              >
                                <span className="text-[10px] font-semibold whitespace-nowrap">
                                  {isSeeking
                                    ? t('search.labelSeeking', 'HĽADÁM')
                                    : t('search.labelOffer', 'PONÚKAM')}
                                </span>
                                {priceLabel && (
                                  <span className="text-[10px] font-semibold whitespace-nowrap">
                                    {priceLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                                  <ScrollableText text={skillTitle} />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {ownerName && <span>{ownerName}</span>}
                                  {ownerName && locationLabel && (
                                    <span>{' • '}</span>
                                  )}
                                  {locationLabel && <span>{locationLabel}</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                      {showUsers &&
                        results.users.map((u) => {
                          // Zobraz "Vy" ak je to vlastný profil
                          const displayName = u.id === user.id ? t('search.you', 'Vy') : u.display_name;
                          const initials = getUserInitials(u.display_name);

                          return (
                            <button
                              key={`user-${u.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-3"
                            >
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={displayName}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs font-semibold">
                                  {initials}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {displayName}
                                </p>
                                {/* Lokalitu pri používateľoch zatiaľ nezobrazujeme podľa zadania */}
                              </div>
                              {u.is_verified && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                                  {t('search.verified', 'Overený')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t(
                        'search.noResults',
                        'Pre zadané vyhľadávanie sa nenašli žiadne výsledky.',
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </aside>

        {/* Hlavná časť – zatiaľ bez výsledkov, všetko je v search paneli */}
        <main className="flex-1" />
      </div>

      {/* Filter modal – nad obsahom, bez straty stavu */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        showSkills={showSkills}
        setShowSkills={setShowSkills}
        showUsers={showUsers}
        setShowUsers={setShowUsers}
        offerType={offerType}
        setOfferType={setOfferType}
        onlyMyLocation={onlyMyLocation}
        setOnlyMyLocation={setOnlyMyLocation}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        onReset={resetFilters}
        onApply={() => {
          setIsFilterOpen(false);
          void handleSearch();
        }}
        t={t}
      />
    </div>
  );
}

