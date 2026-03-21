'use client';

import React, { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import { SearchResultSkeleton } from '@/components/search/SearchResultSkeleton';
import SearchSortSelect from '@/components/search/SearchSortSelect';
import type { Offer } from '@/components/dashboard/modules/profile/profileOffersTypes';
import { mapSearchResultToOffer } from '@/components/search/mapSearchResultToOffer';
import { SearchUsersResults, type GlobalSearchUser } from '@/components/search/SearchUsersResults';
import { SearchOffersTab } from '@/components/search/SearchOffersTab';

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'search.sortNewest' },
  { value: 'rating_desc', labelKey: 'search.sortRatingDesc' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
] as const;
const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const VALID_RATINGS = new Set(['2', '3', '4']);
const VALID_TYPES = new Set(['offer', 'seeking']);
type SearchTab = 'all' | 'users' | 'offers';

function parseTab(value: string | null): SearchTab {
  if (value === 'users' || value === 'offers') return value;
  return 'all';
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const q = searchParams.get('q') ?? '';
  const { t } = useLanguage();

  const tab = parseTab(searchParams.get('tab'));

  const urlSort = searchParams.get('sort') ?? '';
  const urlRating = searchParams.get('rating') ?? '';
  const urlPriceMin = searchParams.get('price_min') ?? '';
  const urlPriceMax = searchParams.get('price_max') ?? '';
  const urlType = searchParams.get('type') ?? '';
  const urlPage = searchParams.get('page') ?? '';

  const parsedSort = VALID_SORTS.has(urlSort) ? urlSort : 'newest';
  const parsedMinRating =
    urlRating && VALID_RATINGS.has(urlRating) ? Number(urlRating) : null;
  const parsedPriceMin = urlPriceMin;
  const parsedPriceMax = urlPriceMax;
  const parsedOfferType: 'all' | 'offer' | 'seeking' = VALID_TYPES.has(urlType)
    ? (urlType as 'offer' | 'seeking')
    : 'all';
  const parsedPage = (() => {
    const n = Number.parseInt(String(urlPage || ''), 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  })();

  const [sort, setSort] = useState<string>(parsedSort);
  const [minRating, setMinRating] = useState<number | null>(parsedMinRating);
  const [priceMin, setPriceMin] = useState<string>(parsedPriceMin);
  const [priceMax, setPriceMax] = useState<string>(parsedPriceMax);
  const [offerType, setOfferType] = useState<'all' | 'offer' | 'seeking'>(parsedOfferType);
  const [results, setResults] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parsedPage);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Global search (users + offers)
  const [globalUsers, setGlobalUsers] = useState<GlobalSearchUser[]>([]);
  const [globalOffers, setGlobalOffers] = useState<Offer[]>([]);
  const [globalUsersCount, setGlobalUsersCount] = useState(0);
  const [globalOffersCount, setGlobalOffersCount] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const replaceSearchParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      if (qs === searchParams.toString()) return;
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    },
    [router, searchParams],
  );

  // URL is source of truth: sync state from query params (back/forward, shared links, manual edits).
  useEffect(() => {
    if (sort !== parsedSort) setSort(parsedSort);
    if (minRating !== parsedMinRating) setMinRating(parsedMinRating);
    if (priceMin !== parsedPriceMin) setPriceMin(parsedPriceMin);
    if (priceMax !== parsedPriceMax) setPriceMax(parsedPriceMax);
    if (offerType !== parsedOfferType) setOfferType(parsedOfferType);
    if (page !== parsedPage) setPage(parsedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSort, parsedMinRating, parsedPriceMin, parsedPriceMax, parsedOfferType, parsedPage]);

  // page reset when filters/sort/query change (via URL): force page=1
  const filterSignature = `${q.trim()}|${parsedSort}|${parsedMinRating ?? ''}|${parsedPriceMin}|${parsedPriceMax}|${parsedOfferType}`;
  const prevSignatureRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSignatureRef.current === null) {
      prevSignatureRef.current = filterSignature;
      return;
    }
    if (prevSignatureRef.current !== filterSignature) {
      prevSignatureRef.current = filterSignature;
      if (parsedPage !== 1) {
        replaceSearchParams({ page: '1' });
      }
    }
  }, [filterSignature, parsedPage, replaceSearchParams]);

  // Scroll to top when filters, sort, or page change (skip initial mount)
  const scrollParamsSignature = `${urlRating}|${urlPriceMin}|${urlPriceMax}|${urlType}|${urlSort}|${urlPage}`;
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollParamsSignature]);

  const fetchSearch = useCallback(async () => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setTotal(0);
      setPage(1);
      setTotalPages(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(endpoints.search, {
        params: {
          q: trimmed,
          page,
          page_size: 12,
          sort,
          min_rating: minRating ?? undefined,
          price_min: priceMin || undefined,
          price_max: priceMax || undefined,
          type: offerType === 'all' ? undefined : offerType,
        },
      });

      const list = Array.isArray(data?.results) ? data.results : [];
      setResults(list.map((s: Record<string, unknown>) => mapSearchResultToOffer(s)));
      setTotal(Number(data?.total) ?? 0);
      setPage(Number(data?.page) ?? 1);
      setTotalPages(Number(data?.total_pages) ?? 0);
    } catch (err: unknown) {
      setResults([]);
      setTotal(0);
      setPage(1);
      setTotalPages(0);
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(typeof msg === 'string' ? msg : 'Nepodarilo sa načítať výsledky.');
    } finally {
      setLoading(false);
    }
  }, [q, sort, page, minRating, priceMin, priceMax, offerType]);

  useEffect(() => {
    if (tab !== 'offers') return;
    void fetchSearch();
  }, [tab, fetchSearch]);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSort = e.target.value;
      if (!VALID_SORTS.has(newSort)) return;
      setSort(newSort);
      setPage(1);
      replaceSearchParams({ sort: newSort, page: '1' });
    },
    [replaceSearchParams],
  );

  const handleToggleFlip = useCallback((cardId: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const hasActiveFilters = Boolean(
    (urlRating && VALID_RATINGS.has(urlRating)) ||
      (urlPriceMin && urlPriceMin.trim() !== '') ||
      (urlPriceMax && urlPriceMax.trim() !== '') ||
      (urlType && VALID_TYPES.has(urlType)),
  );

  const clearAllFilters = useCallback(() => {
    replaceSearchParams({
      rating: null,
      price_min: null,
      price_max: null,
      type: null,
      page: '1',
    });
  }, [replaceSearchParams]);

  const fetchGlobal = useCallback(async () => {
    const trimmed = q.trim();
    if (!trimmed) {
      setGlobalUsers([]);
      setGlobalOffers([]);
      setGlobalUsersCount(0);
      setGlobalOffersCount(0);
      setGlobalError(null);
      setGlobalLoading(false);
      return;
    }

    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const { data } = await api.get(endpoints.searchGlobal, {
        params: { q: trimmed },
      });
      const users = Array.isArray(data?.users) ? (data.users as GlobalSearchUser[]) : [];
      const offersRaw = Array.isArray(data?.offers) ? (data.offers as Record<string, unknown>[]) : [];
      const offers = offersRaw.map((s) => mapSearchResultToOffer(s));
      setGlobalUsers(users);
      setGlobalOffers(offers);
      setGlobalUsersCount(Number(data?.users_count) ?? users.length);
      setGlobalOffersCount(Number(data?.offers_count) ?? offers.length);
    } catch (err: unknown) {
      setGlobalUsers([]);
      setGlobalOffers([]);
      setGlobalUsersCount(0);
      setGlobalOffersCount(0);
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setGlobalError(typeof msg === 'string' ? msg : 'Nepodarilo sa načítať výsledky.');
    } finally {
      setGlobalLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (tab === 'offers') return;
    void fetchGlobal();
  }, [tab, fetchGlobal]);

  const trimmedQ = q.trim();
  const displayQ = trimmedQ || '';
  const headerCountText = (() => {
    if (!trimmedQ) return t('search.emptyEnterQuery', 'Zadajte výraz do vyhľadávacieho poľa.');
    if (tab === 'offers') {
      return loading
        ? t('search.loading', 'Načítavam…')
        : t('search.resultsCount', '{{count}} výsledkov').replace('{{count}}', String(total));
    }
    if (globalLoading) return t('search.loading', 'Načítavam…');
    if (tab === 'users') return `${globalUsersCount} výsledkov`;
    return `${globalUsersCount + globalOffersCount} výsledkov`;
  })();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mb-4">
        <div className="inline-flex p-1 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-[#0f0f10]">
          {([
            { id: 'all', label: 'Všetko' },
            { id: 'users', label: 'Ľudia' },
            { id: 'offers', label: 'Ponuky' },
          ] as const).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  replaceSearchParams({
                    tab: item.id === 'all' ? null : item.id,
                    page: item.id === 'offers' ? '1' : null,
                  });
                }}
                className={[
                  'px-4 py-2 text-sm font-semibold rounded-2xl transition-colors',
                  active
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#141416]',
                ].join(' ')}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t('search.resultsFor', 'Výsledky pre:')} „{displayQ || '…'}“
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{headerCountText}</p>
        </div>

        {trimmedQ && tab === 'offers' && (
          <>
            <div className="hidden lg:block min-w-[180px]">
              <SearchSortSelect
                value={sort}
                onChange={(v) => {
                  if (VALID_SORTS.has(v)) {
                    setSort(v);
                    replaceSearchParams({ sort: v, page: '1' });
                  }
                }}
              />
            </div>
            <select
              value={sort}
              onChange={handleSortChange}
              className="lg:hidden text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="w-full mb-6">
        <div className="border-t border-gray-200 dark:border-gray-700" />
      </div>

      {tab === 'offers' ? (
        <>
          {error && <div className="mb-4 error-alert-modern text-sm">{error}</div>}
          <SearchOffersTab
            t={t}
            trimmedQ={trimmedQ}
            loading={loading}
            results={results}
            flippedCards={flippedCards}
            onToggleFlip={handleToggleFlip}
            minRating={minRating}
            onMinRatingChange={(next) => {
              setMinRating(next);
              setPage(1);
              replaceSearchParams({ rating: next ? String(next) : null, page: '1' });
            }}
            priceMin={priceMin}
            onPriceMinChange={(next) => {
              setPriceMin(next);
              setPage(1);
              replaceSearchParams({ price_min: next || null, page: '1' });
            }}
            priceMax={priceMax}
            onPriceMaxChange={(next) => {
              setPriceMax(next);
              setPage(1);
              replaceSearchParams({ price_max: next || null, page: '1' });
            }}
            offerType={offerType}
            onOfferTypeChange={(next) => {
              setOfferType(next);
              setPage(1);
              replaceSearchParams({ type: next === 'all' ? null : next, page: '1' });
            }}
            hasActiveFilters={hasActiveFilters}
            onClearAllFilters={clearAllFilters}
            page={page}
            totalPages={totalPages}
            onPageChange={(next) => {
              setPage(next);
              replaceSearchParams({ page: String(next) });
            }}
          />
        </>
      ) : (
        <>
          {globalError && <div className="mb-4 error-alert-modern text-sm">{globalError}</div>}

          {!trimmedQ ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                {t('search.emptyEnterQuery', 'Zadajte výraz do vyhľadávacieho poľa.')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <SearchUsersResults
                title="Ľudia"
                users={globalUsers}
                loading={globalLoading}
                count={globalUsersCount}
                currentUserId={user?.id ?? null}
              />

              {tab === 'all' && (
                <section className="w-full">
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ponuky</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{globalOffersCount} výsledkov</p>
                    </div>
                  </div>

                  {globalLoading && globalOffers.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
                      {Array.from({ length: 6 }, (_, i) => (
                        <SearchResultSkeleton key={i} />
                      ))}
                    </div>
                  ) : globalOffers.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white/60 dark:bg-[#0f0f10] px-4 py-5">
                      Žiadne ponuky.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
                      {globalOffers.map((offer) => {
                        const cardId =
                          offer.id != null
                            ? String(offer.id)
                            : `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
                        const isFlipped = flippedCards.has(cardId);
                        const ext = offer as Offer & { user_display_name?: string; owner_user_type?: string };
                        const ownerDisplayName = typeof ext.user_display_name === 'string' ? ext.user_display_name : '';

                        return (
                          <div key={offer.id} className="relative group">
                            <ProfileOfferCard
                              offer={offer}
                              accountType={ext.owner_user_type === 'company' ? 'business' : 'personal'}
                              t={t}
                              isFlipped={isFlipped}
                              onToggleFlip={() => handleToggleFlip(cardId)}
                              isOtherUserProfile={true}
                              ownerDisplayName={ownerDisplayName || undefined}
                              onRequestClick={undefined}
                              onMessageClick={undefined}
                              requestLabel={undefined}
                              isRequestDisabled={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
