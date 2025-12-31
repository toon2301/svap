"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import type { User } from '../../../types';
import type { Offer } from './profile/profileOffersTypes';

type SearchSkill = Offer & {
  created_at?: string;
  updated_at?: string;
  // Meno používateľa pre kompaktné zobrazenie vo vyhľadávaní (pridáva backend)
  user_display_name?: string | null;
  // ID používateľa pre identifikáciu vlastných ponúk
  user_id?: number | null;
};

interface SearchUserResult {
  id: number;
  display_name: string;
  district?: string | null;
  location?: string | null;
  is_verified: boolean;
  avatar_url?: string | null;
}

interface SearchResults {
  skills: SearchSkill[];
  users: SearchUserResult[];
}

interface SearchModuleProps {
  user: User;
}

interface SkillResultCardProps {
  skill: SearchSkill;
  t: (key: string, fallback?: string) => string;
}

interface UserResultCardProps {
  user: SearchUserResult;
  t: (key: string, fallback?: string) => string;
}

interface ScrollableTextProps {
  text: string;
}


function getUserInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) ?? ''}${parts[1]?.charAt(0) ?? ''}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

function ScrollableText({ text }: ScrollableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [translateX, setTranslateX] = useState(0);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      const needsScroll = textWidth > containerWidth;
      setShouldScroll(needsScroll);
      if (needsScroll) {
        // Vypočítaj, o koľko pixelov musíme posunúť text doľava
        setTranslateX(containerWidth - textWidth);
      }
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        ref={textRef}
        className="font-medium inline-block whitespace-nowrap transition-transform duration-[2000ms] ease-linear"
        style={
          shouldScroll && isHovered
            ? {
                transform: `translateX(${translateX}px)`,
              }
            : {
                transform: 'translateX(0)',
              }
        }
      >
        {text}
      </span>
    </div>
  );
}

function SkillResultCard({ skill, t }: SkillResultCardProps) {
  const mainLabel = skill.subcategory || skill.category;
  const locationLabel =
    skill.location || skill.district || t('search.noLocation', 'Bez lokality');
  const isSeeking = skill.is_seeking === true;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 truncate">{mainLabel}</h3>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            isSeeking ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}
        >
          {isSeeking
            ? t('search.labelSeeking', 'HĽADÁM')
            : t('search.labelOffer', 'PONÚKAM')}
        </span>
      </div>
      <p className="text-sm text-gray-500 truncate">
        {skill.category !== mainLabel ? `${skill.category} • ` : ''}
        {locationLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {skill.price_from != null && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5">
            {t('search.priceFrom', 'od')}{' '}
            <span className="font-medium text-gray-800 ml-1">
              {Number(skill.price_from).toLocaleString('sk-SK')}{' '}
              {skill.price_currency || '€'}
            </span>
          </span>
        )}
        {Array.isArray(skill.tags) &&
          skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5"
            >
              #{tag}
            </span>
          ))}
      </div>
    </div>
  );
}

function UserResultCard({ user, t }: UserResultCardProps) {
  const locationLabel =
    user.location || user.district || t('search.noLocation', 'Bez lokality');

  const initials = getUserInitials(user.display_name);

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex items-center gap-3">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.display_name}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-sm font-semibold">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate">{user.display_name}</p>
          {user.is_verified && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700">
              {t('search.verified', 'Overený')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{locationLabel}</p>
      </div>
      <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
        {t('search.profileBadge', 'PROFIL')}
      </span>
    </div>
  );
}

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
            className="p-4 sm:p-5 pt-8 sm:pt-10"
          >
            <div className="space-y-4">
              {/* Vyhľadávacie pole + Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Hľadať
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('search.filter', 'Filter')}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Vyhľadávanie"
                      className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent text-sm"
                    />
                    {/* Progress indikátor pri načítaní */}
                    {isSearching && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 animate-progress-bar" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Výsledky priamo v search navigácii */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl px-3 py-2">
                  {error}
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
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-start gap-3"
                            >
                              <div
                                className={`px-2 py-1.5 rounded-full flex flex-col items-center justify-center flex-shrink-0 ${
                                  isSeeking
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-purple-50 text-purple-700'
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
                                <div className="flex items-center gap-1 text-sm text-gray-900">
                                  <ScrollableText text={skillTitle} />
                                </div>
                                <div className="text-xs text-gray-500 truncate">
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
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-3"
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
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {displayName}
                                </p>
                                {/* Lokalitu pri používateľoch zatiaľ nezobrazujeme podľa zadania */}
                              </div>
                              {u.is_verified && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 font-semibold">
                                  {t('search.verified', 'Overený')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500">
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
      {isFilterOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsFilterOpen(false)}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('search.filterTitle', 'Filtre vyhľadávania')}
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label={t('common.close', 'Zavrieť')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
              {/* Typ výsledkov – skills / users */}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t('search.filterResultTypes', 'Typ výsledkov')}
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={showSkills}
                        onChange={(e) => setShowSkills(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                        {showSkills && (
                          <svg
                            className="w-4 h-4 text-purple-600 dark:text-purple-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {t('search.filterShowSkills', 'Zobraziť ponuky zručností')}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={showUsers}
                        onChange={(e) => setShowUsers(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                        {showUsers && (
                          <svg
                            className="w-4 h-4 text-purple-600 dark:text-purple-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {t('search.filterShowUsers', 'Zobraziť používateľov')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Typ ponuky – Ponúkam / Hľadám */}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t('search.offerTypeTitle', 'Typ ponuky')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOfferType('all')}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      offerType === 'all'
                        ? 'border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                    }`}
                  >
                    {t('search.offerTypeAll', 'Všetko')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferType('offer')}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      offerType === 'offer'
                        ? 'border-purple-300 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-200 dark:hover:border-purple-700 hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                    }`}
                  >
                    {t('search.offerTypeOffer', 'Ponúkam')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferType('seeking')}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      offerType === 'seeking'
                        ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                    }`}
                  >
                    {t('search.offerTypeSeeking', 'Hľadám')}
                  </button>
                </div>
              </div>

              {/* Cena od - do */}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t('search.priceTitle', 'Cena (ponuky zručností)')}
                </p>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
                      {t('search.priceMin', 'Od')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5 font-medium">
                      {t('search.priceMax', 'Do')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              {/* Len v mojej lokalite */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={onlyMyLocation}
                      onChange={(e) => setOnlyMyLocation(e.target.checked)}
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:border-purple-400 dark:peer-checked:border-purple-500 peer-checked:bg-purple-100 dark:peer-checked:bg-purple-900/40 peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-600 peer-focus:ring-offset-1 transition-all duration-200 group-hover:border-purple-200 dark:group-hover:border-purple-500 flex items-center justify-center">
                      {onlyMyLocation && (
                        <svg
                          className="w-4 h-4 text-purple-600 dark:text-purple-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {t(
                      'search.onlyMyLocation',
                      'Len v mojej lokalite (podľa profilu)',
                    )}
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('search.resetFilters', 'Resetovať')}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Zrušiť')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterOpen(false);
                    void handleSearch();
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 shadow-sm transition-all"
                >
                  {t('search.applyFilters', 'Použiť filtre')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

