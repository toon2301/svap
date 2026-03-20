'use client';

import React, { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
import { FilterChips } from '@/components/search/FilterChips';
import { SearchResultSkeleton } from '@/components/search/SearchResultSkeleton';
import SearchSortSelect from '@/components/search/SearchSortSelect';
import SearchFilterSelect from '@/components/search/SearchFilterSelect';
import type { Offer, ExperienceUnit } from '@/components/dashboard/modules/profile/profileOffersTypes';
import type { OpeningHours } from '@/components/dashboard/modules/skills/skillDescriptionModal/types';

function mapSearchResultToOffer(s: Record<string, unknown>): Offer {
  const rawPrice = s.price_from;
  const parsedPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string' && String(rawPrice).trim() !== ''
        ? parseFloat(String(rawPrice))
        : null;

  const exp = s.experience as { value?: number; unit?: string } | undefined;
  const experience = exp
    ? {
        value: typeof exp.value === 'number' ? exp.value : parseFloat(String(exp.value || 0)),
        unit: (exp.unit === 'years' || exp.unit === 'months' ? exp.unit : 'years') as ExperienceUnit,
      }
    : undefined;

  const imagesRaw = Array.isArray(s.images) ? s.images : [];
  const images = imagesRaw.map((im: Record<string, unknown>) => ({
    id: Number(im.id) || 0,
    image_url: (im.image_url || im.image || null) as string | null,
    order: im.order as number | undefined,
  }));

  const base: Offer = {
    id: Number(s.id),
    category: String(s.category || ''),
    subcategory: String(s.subcategory || ''),
    description: String(s.description || ''),
    detailed_description: String(s.detailed_description || ''),
    images,
    price_from: parsedPrice,
    price_currency:
      typeof s.price_currency === 'string' && s.price_currency.trim() !== '' ? s.price_currency : '€',
    district: typeof s.district === 'string' ? s.district : '',
    location: typeof s.location === 'string' ? s.location : '',
    experience,
    tags: Array.isArray(s.tags) ? s.tags : [],
    opening_hours: (s.opening_hours || undefined) as OpeningHours | undefined,
    is_seeking: s.is_seeking === true,
    urgency:
      typeof s.urgency === 'string' && s.urgency.trim() !== ''
        ? (s.urgency.trim() as 'low' | 'medium' | 'high' | '')
        : '',
    duration_type: (s.duration_type || null) as Offer['duration_type'],
    is_hidden: s.is_hidden === true,
    average_rating: s.average_rating as number | null | undefined,
    reviews_count: typeof s.reviews_count === 'number' ? s.reviews_count : 0,
  };
  return {
    ...base,
    user_display_name: typeof s.user_display_name === 'string' ? s.user_display_name : '',
    owner_user_type: typeof s.owner_user_type === 'string' ? s.owner_user_type : 'individual',
  } as Offer & { user_display_name?: string; owner_user_type?: string };
}

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'search.sortNewest' },
  { value: 'rating_desc', labelKey: 'search.sortRatingDesc' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
] as const;
const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const VALID_RATINGS = new Set(['2', '3', '4']);
const VALID_TYPES = new Set(['offer', 'seeking']);

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') ?? '';
  const { t } = useLanguage();

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
    void fetchSearch();
  }, [fetchSearch]);

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

  const hasActiveFilters =
    (urlRating && VALID_RATINGS.has(urlRating)) ||
    (urlPriceMin && urlPriceMin.trim() !== '') ||
    (urlPriceMax && urlPriceMax.trim() !== '') ||
    (urlType && VALID_TYPES.has(urlType));

  const clearAllFilters = useCallback(() => {
    replaceSearchParams({
      rating: null,
      price_min: null,
      price_max: null,
      type: null,
      page: '1',
    });
  }, [replaceSearchParams]);

  const trimmedQ = q.trim();
  const displayQ = trimmedQ || '';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {t('search.resultsFor', 'Výsledky pre:')} „{displayQ || '…'}“
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? t('search.loading', 'Načítavam…') : t('search.resultsCount', '{{count}} výsledkov').replace('{{count}}', String(total))}
            </p>
          </div>
          {trimmedQ && (
            <>
              {/* Desktop: custom dropdown ako v modale na vytvorenie karty */}
              <div className="hidden lg:block min-w-[180px]">
                <SearchSortSelect value={sort} onChange={(v) => { if (VALID_SORTS.has(v)) { setSort(v); replaceSearchParams({ sort: v, page: '1' }); } }} />
              </div>
              {/* Mobile: natívny select */}
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

      {error && (
        <div className="mb-4 error-alert-modern text-sm">{error}</div>
      )}

        <FilterChips />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop: filter sidebar – custom dropdowny ako v modale */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  ⭐ {t('search.ratingLabel', 'Hodnotenie')}
                </label>
                <SearchFilterSelect
                  value={minRating != null ? String(minRating) : ''}
                  options={[
                    { value: '', label: t('search.offerTypeAll', 'Všetko') },
                    { value: '4', label: '4+' },
                    { value: '3', label: '3+' },
                    { value: '2', label: '2+' },
                  ]}
                  onChange={(v) => {
                    const next = v ? Number(v) : null;
                    setMinRating(next);
                    setPage(1);
                    replaceSearchParams({
                      rating: next ? String(next) : null,
                      page: '1',
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  💰 {t('search.priceTitle', 'Cena')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={t('search.priceMin', 'Od')}
                    value={priceMin}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPriceMin(next);
                      setPage(1);
                      replaceSearchParams({
                        price_min: next || null,
                        page: '1',
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="number"
                    placeholder="Do"
                    value={priceMax}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPriceMax(next);
                      setPage(1);
                      replaceSearchParams({
                        price_max: next || null,
                        page: '1',
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  🔁 {t('search.offerTypeTitle', 'Typ ponuky')}
                </label>
                <SearchFilterSelect
                  value={offerType}
                  options={[
                    { value: 'all', label: t('search.offerTypeAll', 'Všetko') },
                    { value: 'offer', label: t('search.offerTypeOffer', 'Ponúkam') },
                    { value: 'seeking', label: t('search.offerTypeSeeking', 'Hľadám') },
                  ]}
                  onChange={(v) => {
                    const next = v as 'all' | 'offer' | 'seeking';
                    setOfferType(next);
                    setPage(1);
                    replaceSearchParams({
                      type: next === 'all' ? null : next,
                      page: '1',
                    });
                  }}
                />
              </div>
            </div>
          </aside>

          {/* Grid */}
          <main className="flex-1 min-w-0">
            {loading && results.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
                {Array.from({ length: 8 }, (_, i) => (
                  <SearchResultSkeleton key={i} />
                ))}
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-base font-medium text-gray-900 dark:text-white mb-2">
                  {trimmedQ
                    ? t('search.emptyNoResults', 'Žiadne výsledky pre „{{q}}"').replace('{{q}}', trimmedQ)
                    : t('search.emptyEnterQuery', 'Zadajte výraz do vyhľadávacieho poľa.')}
                </p>
                {trimmedQ && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t('search.emptyTry', 'Skús:')}
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 text-left list-disc list-inside space-y-1 mb-6">
                      <li>{t('search.emptyTryRemoveFilters', 'odstrániť filtre')}</li>
                      <li>{t('search.emptyTryShorterQuery', 'použiť kratší výraz')}</li>
                      <li>{t('search.emptyTryChangePrice', 'zmeniť cenu')}</li>
                    </ul>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {t('search.clearFilters', 'Vymazať filtre')}
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
                {results.map((offer) => {
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => {
                    setPage((p) => {
                      const next = Math.max(1, p - 1);
                      replaceSearchParams({ page: String(next) });
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('search.paginationPrevious', 'Predošlá')}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => {
                      setPage(number);
                      replaceSearchParams({ page: String(number) });
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      page === number
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage((p) => {
                      const next = Math.min(totalPages, p + 1);
                      replaceSearchParams({ page: String(next) });
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('search.paginationNext', 'Ďalšia')}
                </button>
              </div>
            )}
          </main>
        </div>
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
