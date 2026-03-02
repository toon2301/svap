'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileOfferCard from '@/components/dashboard/modules/profile/ProfileOfferCard';
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

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { t } = useLanguage();

  const [results, setResults] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

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
        params: { q: trimmed, page: 1, page_size: 12 },
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
  }, [q]);

  useEffect(() => {
    void fetchSearch();
  }, [fetchSearch]);

  const handleToggleFlip = useCallback((cardId: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const trimmedQ = q.trim();
  const displayQ = trimmedQ || '';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Výsledky pre: „{displayQ || '…'}“
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {loading ? 'Načítavam…' : `${total} výsledkov`}
        </p>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop: sidebar placeholder */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-sm text-gray-500 dark:text-gray-400">
              Filtre
            </div>
          </aside>

          {/* Grid */}
          <main className="flex-1 min-w-0">
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
              </div>
            ) : results.length === 0 && !loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8">
                {trimmedQ ? 'Žiadne výsledky.' : 'Zadajte výraz do vyhľadávacieho poľa.'}
              </p>
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
          </main>
        </div>
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
