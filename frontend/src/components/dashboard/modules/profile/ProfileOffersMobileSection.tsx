'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, endpoints } from '../../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';

type ExperienceUnit = 'years' | 'months';

interface OfferExperience {
  value: number;
  unit: ExperienceUnit;
}

interface OfferImage {
  id: number;
  image_url?: string | null;
  image?: string | null;
  order?: number;
}

interface Offer {
  id: number;
  category: string;
  subcategory: string;
  description: string;
  detailed_description?: string;
  images?: OfferImage[];
  price_from?: number | null;
  price_currency?: string;
  district?: string;
  location?: string;
  experience?: OfferExperience;
  tags?: string[];
  opening_hours?: OpeningHours;
}

interface ProfileOffersMobileSectionProps {
  accountType?: 'personal' | 'business';
}

function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const HOURS_DAYS = [
  { key: 'monday' as const, shortLabel: 'Po' },
  { key: 'tuesday' as const, shortLabel: 'Ut' },
  { key: 'wednesday' as const, shortLabel: 'St' },
  { key: 'thursday' as const, shortLabel: 'Št' },
  { key: 'friday' as const, shortLabel: 'Pi' },
  { key: 'saturday' as const, shortLabel: 'So' },
  { key: 'sunday' as const, shortLabel: 'Ne' },
] as const;

export default function ProfileOffersMobileSection({
  accountType = 'personal',
}: ProfileOffersMobileSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [hoursModal, setHoursModal] = useState<OpeningHours | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const { data } = await api.get(endpoints.skills.list);
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];

        const mapped: Offer[] = list.map((s: any) => {
          const rawPrice = s.price_from;
          const parsedPrice =
            typeof rawPrice === 'number'
              ? rawPrice
              : typeof rawPrice === 'string' && rawPrice.trim() !== ''
                ? parseFloat(rawPrice)
                : null;

          const experience = s.experience
            ? {
                value:
                  typeof s.experience.value === 'number'
                    ? s.experience.value
                    : parseFloat(String(s.experience.value || 0)),
                unit: (s.experience.unit === 'years' || s.experience.unit === 'months'
                  ? s.experience.unit
                  : 'years') as ExperienceUnit,
              }
            : undefined;

          return {
            id: s.id,
            category: s.category,
            subcategory: s.subcategory,
            description: s.description || '',
            detailed_description: (s.detailed_description || '') as string,
            images: Array.isArray(s.images)
              ? s.images.map((im: any) => ({
                  id: im.id,
                  image_url: im.image_url || im.image || null,
                  order: im.order,
                }))
              : [],
            price_from: parsedPrice,
            price_currency:
              typeof s.price_currency === 'string' && s.price_currency.trim() !== ''
                ? s.price_currency
                : '€',
            district: typeof s.district === 'string' ? s.district : '',
            location: typeof s.location === 'string' ? s.location : '',
            experience,
            tags: Array.isArray(s.tags) ? s.tags : [],
            opening_hours: (s.opening_hours || undefined) as OpeningHours | undefined,
          };
        });

        setOffers(mapped);
      } catch (error: any) {
        if (cancelled) return;
        const msg =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          t('profile.offersLoadError', 'Nepodarilo sa načítať ponuky. Skús to znova.');
        setLoadError(msg);
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
  }, [t]);

  const handleCardClick = (offer: Offer) => {
    setSelectedOffer(offer);
  };

  const handleDetailClose = () => {
    setSelectedOffer(null);
    setHoursModal(null);
  };

  const renderDetailOverlay = () => {
    if (!selectedOffer || typeof document === 'undefined') {
      return null;
    }

    const offer = selectedOffer;
    const catSlug = offer.category ? slugifyLabel(offer.category) : '';
    const subSlug = offer.subcategory ? slugifyLabel(offer.subcategory) : '';
    const translatedLabel =
      offer.subcategory && catSlug && subSlug
        ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, offer.subcategory)
        : offer.category && catSlug
          ? t(`skillsCatalog.categories.${catSlug}`, offer.category)
          : offer.subcategory || offer.category || '';

    const headline =
      (offer.description && offer.description.trim()) ||
      translatedLabel ||
      t('skills.noDescription', 'Bez popisu');

    const priceLabel =
      offer.price_from !== null && offer.price_from !== undefined
        ? `${Number(offer.price_from).toLocaleString('sk-SK', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} ${offer.price_currency || '€'}`
        : null;

    const locationText = offer.location && offer.location.trim();
    const districtText = offer.district && offer.district.trim();
    const displayLocationText = locationText || districtText || null;

    const hasAnyOpeningHours =
      offer.opening_hours &&
      HOURS_DAYS.some((d) => {
        const data = offer.opening_hours?.[d.key];
        return data && (data as any).enabled;
      });

    const body = (
      <>
        <div
          className="fixed inset-0 z-[60] bg-black/40"
          onClick={handleDetailClose}
        />
        <div
          className="fixed inset-x-0 bottom-0 top-10 z-[61] rounded-t-3xl bg-[var(--background)] text-[var(--foreground)] shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleDetailClose}
              aria-label={t('common.back', 'Späť')}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
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
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                {t('skills.description', 'Popis')}
              </div>
            </div>
            {accountType === 'business' && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full">
                PRO
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto subtle-scrollbar">
            <div className="px-4 pt-3 pb-5 space-y-4">
              {/* Detailed description */}
              <div className="space-y-1 pb-4 border-b border-gray-200 dark:border-gray-800">
                {offer.detailed_description && offer.detailed_description.trim() ? (
                  <div className="max-h-[277px] overflow-y-auto subtle-scrollbar">
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {offer.detailed_description}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      'skills.detailedDescriptionEmpty',
                      'Zatiaľ nemáš pridaný podrobný opis tejto služby.'
                    )}
                  </p>
                )}
              </div>

              {/* Opening hours */}
              {accountType === 'business' && offer.opening_hours && (
                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={!hasAnyOpeningHours}
                    onClick={() => {
                      if (hasAnyOpeningHours) {
                        setHoursModal(offer.opening_hours || null);
                      }
                    }}
                    className="flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-4 h-4 text-gray-600 dark:text-gray-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      {t('skills.openingHours.title', 'Otváracie hodiny')}
                    </div>
                  </button>
                </div>
              )}

              {/* Tags */}
              {offer.tags && offer.tags.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                    {t('skills.tags', 'Tagy')}
                  </div>
                  <div className="flex flex-wrap gap-1.5 -gap-y-1">
                    {offer.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-[11px] font-medium text-purple-700 dark:text-purple-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social / ratings (statické placeholdery ako na desktope) */}
              <div className="space-y-1 pt-1 border-t border-dashed border-gray-200 dark:border-gray-700/60">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                  {t('skills.ratings', 'Hodnotenia')}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <svg
                        key={i}
                        className="w-4 h-4 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <div className="relative w-4 h-4">
                      <svg
                        className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current absolute"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <svg
                        className="w-4 h-4 text-yellow-400 fill-current absolute overflow-hidden"
                        style={{ clipPath: 'inset(0 50% 0 0)' }}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    12 645
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('skills.likes', 'Páči sa mi to')}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    3 564
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );

    return createPortal(body, document.getElementById('app-root') ?? document.body);
  };

  if (isLoading && offers.length === 0) {
    return (
      <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t('profile.offersLoading', 'Načítavam tvoje karty...')}
      </div>
    );
  }

  if (loadError && offers.length === 0) {
    return (
      <div className="mt-3 text-sm text-red-600 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  const renderHoursModal = () => {
    if (!hoursModal || typeof document === 'undefined') return null;

    const hasAny = HOURS_DAYS.some((d) => {
      const data = hoursModal[d.key as keyof OpeningHours];
      return data && (data as any).enabled;
    });

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[70] bg-black/45"
          onClick={() => setHoursModal(null)}
        />
        <div
          className="fixed inset-0 z-[71] flex items-center justify-center px-4"
          onClick={() => setHoursModal(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-gray-200 dark:border-gray-700 shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm font-semibold">
                  {t('skills.openingHours.title', 'Otváracie hodiny')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHoursModal(null)}
                aria-label={t('common.close', 'Zatvoriť')}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="rounded-xl bg-gray-50/80 dark:bg-[#101012] border border-gray-200/70 dark:border-gray-700/60 px-3 py-2 space-y-1 max-h-64 overflow-y-auto subtle-scrollbar">
              {hasAny ? (
                HOURS_DAYS.map((day) => {
                  const data = hoursModal[day.key as keyof OpeningHours] as any;
                  if (!data || !data.enabled) return null;
                  return (
                    <div
                      key={day.key}
                      className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200"
                    >
                      <span className="font-medium w-10">{day.shortLabel}</span>
                      <span className="tabular-nums">
                        {data.from || '—'} – {data.to || '—'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                  {t(
                    'skills.openingHours.empty',
                    'Otváracie hodiny zatiaľ nie sú nastavené alebo je prevádzka zatvorená.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>,
      document.getElementById('app-root') ?? document.body
    );
  };

  return (
    <>
      <div className="mt-3 space-y-3">
        {offers.map((offer) => {
          const catSlug = offer.category ? slugifyLabel(offer.category) : '';
          const subSlug = offer.subcategory ? slugifyLabel(offer.subcategory) : '';
          const translatedLabel =
            offer.subcategory && catSlug && subSlug
              ? t(`skillsCatalog.subcategories.${catSlug}.${subSlug}`, offer.subcategory)
              : offer.category && catSlug
                ? t(`skillsCatalog.categories.${catSlug}`, offer.category)
                : offer.subcategory || offer.category || '';

          const imageAlt =
            (offer.description && offer.description.trim()) ||
            translatedLabel ||
            t('skills.offer', 'Ponúkam');

          const headline =
            (offer.description && offer.description.trim()) ||
            translatedLabel ||
            t('skills.noDescription', 'Bez popisu');

          const priceLabel =
            offer.price_from !== null && offer.price_from !== undefined
              ? `${Number(offer.price_from).toLocaleString('sk-SK', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })} ${offer.price_currency || '€'}`
              : null;

          const locationText = offer.location && offer.location.trim();
          const districtText = offer.district && offer.district.trim();
          const displayLocationText = locationText || districtText || null;

          const imageCount = offer.images?.filter((img) => img?.image_url || img?.image).length || 0;
          const hasMultipleImages = imageCount > 1;

          return (
            <button
              key={offer.id}
              type="button"
              className="w-full text-left rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10] shadow-sm active:scale-[0.99] transition-transform"
              onClick={() => handleCardClick(offer)}
            >
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden">
                <OfferImageCarousel images={offer.images} alt={imageAlt} />
                {accountType === 'business' && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
                    PRO
                  </span>
                )}
                {hasMultipleImages && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-[10px] font-medium flex items-center gap-1">
                    <svg
                      className="w-3 h-3 opacity-80"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>{imageCount}</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                {translatedLabel && (
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 break-words">
                    {translatedLabel}
                  </p>
                )}
                <p className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                  {headline}
                </p>
                {displayLocationText && (
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {t('skills.locationLabel', 'Miesto:')}
                    </span>
                    <span className="break-words flex-1">{displayLocationText}</span>
                  </div>
                )}
                {offer.experience && (
                  <div className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {t('skills.experience', 'Prax:')}
                    </span>
                    <span>
                      {offer.experience.value}{' '}
                      {offer.experience.unit === 'years'
                        ? t('skills.years', 'rokov')
                        : t('skills.months', 'mesiacov')}
                    </span>
                  </div>
                )}
                {priceLabel && (
                  <div className="mt-2 w-full px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {t('skills.priceFrom', 'Cena od:')}
                      </span>
                      <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                        {priceLabel}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {renderDetailOverlay()}
      {renderHoursModal()}
    </>
  );
}


