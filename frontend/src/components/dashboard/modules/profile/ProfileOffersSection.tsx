'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, endpoints } from '../../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import OfferImageCarousel from '../shared/OfferImageCarousel';
import type { ProfileTab } from './profileTypes';
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

interface ProfileOffersSectionProps {
  activeTab: ProfileTab;
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

export default function ProfileOffersSection({ activeTab, accountType = 'personal' }: ProfileOffersSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number | string>>(() => new Set());
  const [activeHoursOfferId, setActiveHoursOfferId] = useState<number | string | null>(null);
  const [hoursPopoverPosition, setHoursPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeOpeningHours, setActiveOpeningHours] = useState<OpeningHours | null>(null);

  // Load offers when switching to 'offers' tab (desktop focus)
  useEffect(() => {
    if (activeTab !== 'offers') return;

    const load = async () => {
      try {
        const { data } = await api.get(endpoints.skills.list);
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
      } catch {
        // silent
      }
    };

    void load();
  }, [activeTab]);

  // Close hours popover when clicking outside
  useEffect(() => {
    if (!activeHoursOfferId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // Ignore clicks inside the popover
      if (target.closest('[data-opening-hours-popover]')) {
        return;
      }
      setActiveHoursOfferId(null);
      setHoursPopoverPosition(null);
      setActiveOpeningHours(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeHoursOfferId]);

  if (activeTab !== 'offers') {
    return null;
  }

  return (
    <div className="mt-4">
      {offers.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Zatiaľ nemáš žiadne ponuky.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-[clamp(1rem,2vw,1.5rem)]">
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
            const label = translatedLabel;
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
            const cardId =
              offer.id ??
              `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
            const isFlipped = flippedCards.has(cardId);

            const handleFlip = (e: React.MouseEvent) => {
              e.stopPropagation();
              setFlippedCards((prev) => {
                const next = new Set(prev);
                if (next.has(cardId)) {
                  next.delete(cardId);
                } else {
                  next.add(cardId);
                }
                return next;
              });
            };

            const handleOpenHoursClick = (event: React.MouseEvent<HTMLButtonElement>) => {
              if (!offer.opening_hours) return;

              const hasAnyEnabled = Object.values(offer.opening_hours).some(
                (day) => day && (day as any).enabled
              );
              if (!hasAnyEnabled) return;

              if (activeHoursOfferId === cardId) {
                setActiveHoursOfferId(null);
                setHoursPopoverPosition(null);
                setActiveOpeningHours(null);
              } else {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const isMobile = viewportWidth <= 640; // sm breakpoint
                
                let top: number;
                let left: number;

                if (isMobile) {
                  // Na mobile: center modal
                  const popoverWidth = Math.min(viewportWidth - 32, 320); // max 320px, s paddingom 16px na každú stranu
                  const popoverHeight = 180; // zmenšená výška pre mobile
                  top = (viewportHeight - popoverHeight) / 2;
                  left = (viewportWidth - popoverWidth) / 2;
                } else {
                  // Na desktop: pozícia relatívne k tlačidlu
                  const rect = event.currentTarget.getBoundingClientRect();
                  const popoverWidth = 260;
                  const popoverHeight = 200;

                  top = rect.bottom + 8;
                  left = rect.left + rect.width / 2 - popoverWidth / 2;

                  // Ak by popover pretiekol dole, zobraz ho nad tlačidlom
                  if (top + popoverHeight > viewportHeight - 8) {
                    top = rect.top - popoverHeight - 8;
                  }
                  if (top < 8) top = 8;

                  // Horizontálne ohraničenie
                  if (left + popoverWidth > viewportWidth - 8) {
                    left = viewportWidth - popoverWidth - 8;
                  }
                  if (left < 8) left = 8;
                }

                setActiveHoursOfferId(cardId);
                setHoursPopoverPosition({ top, left });
                setActiveOpeningHours(offer.opening_hours);
              }
            };

            const FlipButton = ({ extraClasses = '' }: { extraClasses?: string }) => (
              <button
                onClick={handleFlip}
                aria-label="Otočiť"
                title="Otočiť"
                className={`absolute -top-2.5 -right-3 -translate-y-1/2 p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors ${extraClasses}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-3 h-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            );

            return (
              <div key={offer.id} className="relative">
                <div className="rounded-2xl overflow-visible border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#0f0f10] shadow-sm hover:shadow transition-shadow">
                  <div className={isFlipped ? 'hidden' : 'block'}>
                    <div className="relative aspect-[3/2] bg-gray-100 dark:bg-[#0e0e0f] overflow-hidden rounded-t-2xl">
                      <OfferImageCarousel images={offer.images} alt={imageAlt} />
                      {accountType === 'business' && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-semibold bg-black/80 text-white rounded">
                          PRO
                        </span>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-0.5">
                        <button
                          aria-label="Páči sa mi to"
                          title="Páči sa mi to"
                          className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3 h-3"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>
                        <button
                          aria-label="Zdieľať"
                          title="Zdieľať"
                          className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3 h-3"
                          >
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                        <button
                          aria-label="Pridať recenziu"
                          title="Pridať recenziu"
                          className="p-1 rounded-full bg-purple-50 dark:bg-purple-900/80 dark:backdrop-blur-sm border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-white hover:bg-purple-100 dark:hover:bg-purple-900/90 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3 h-3"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="relative p-3 flex flex-col h-52 border-t border-gray-200 dark:border-gray-700/50">
                      <FlipButton />
                      {/* Scrollovateľná časť: nadpis a opis */}
                      <div
                        className="flex-1 overflow-y-auto subtle-scrollbar pr-1"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
                        }}
                      >
                        {label ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                            {label}
                          </div>
                        ) : null}
                        <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                          {headline}
                        </div>
                      </div>
                      {/* Fixná časť: miesto, prax, cena, "Ponúkam" */}
                      <div className="flex-shrink-0">
                        <div className="mt-2 mb-1.5 flex items-start justify-end gap-3">
                          <div className="flex-1 min-w-0 mr-auto flex flex-col gap-0.5">
                            {displayLocationText && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                                <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">
                                  {t('skills.locationLabel', 'Miesto:')}
                                </span>
                                <span className="break-words">{displayLocationText}</span>
                              </div>
                            )}
                            {offer.experience && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="font-medium text-gray-900 dark:text-white">
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
                          </div>
                          {priceLabel && (
                            <div className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 flex-shrink-0">
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">
                                {t('skills.priceFrom', 'Cena od:')}
                              </div>
                              <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                {priceLabel}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="-mb-2 pt-0 pb-0 text-center text-[8px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t('skills.offering', 'Ponúkam')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={isFlipped ? 'block' : 'hidden'} style={{ minHeight: '100%' }}>
                    <div className="relative aspect-[3/2] rounded-t-2xl border-b border-gray-200/70 dark:border-gray-700/50 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#101012] dark:to-[#151518]">
                      <div
                        className="absolute inset-0 p-4 overflow-y-auto subtle-scrollbar"
                        style={{
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
                        }}
                      >
                        {offer.detailed_description && offer.detailed_description.trim() ? (
                          <>
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-1 text-center">
                              {t('skills.description', 'Popis')}
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                              {offer.detailed_description}
                            </p>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                              {t('skills.noDescription', 'Bez popisu')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-3 flex flex-col h-52 border-t border-gray-200 dark:border-gray-700/50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0f0f10] dark:to-[#151518] overflow-hidden rounded-b-2xl">
                        <div className="flex-1 flex flex-col justify-start pt-0 xl:pt-0.5">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-0 xl:mb-0">
                          {t('skills.ratings', 'Hodnotenia')}
                        </div>
                        <div className="flex items-center gap-3 mb-0 xl:-mb-0.5">
                          <div className="flex items-center gap-0.5">
                            {/* 3 plné hviezdičky */}
                            {[1, 2, 3].map((i) => (
                              <svg
                                key={i}
                                className="w-5 h-5 text-yellow-400 fill-current"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            {/* Polovičná hviezdička */}
                            <div className="relative w-5 h-5">
                              <svg
                                className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current absolute"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <svg
                                className="w-5 h-5 text-yellow-400 fill-current absolute overflow-hidden"
                                style={{ clipPath: 'inset(0 50% 0 0)' }}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                            {/* 1 prázdna hviezdička */}
                            <svg
                              className="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                            12 645
                          </span>
                        </div>
                        {accountType === 'business' && (
                          <button
                            type="button"
                            onClick={handleOpenHoursClick}
                            className="mt-1 lg:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 focus:outline-none"
                          >
                            <span>{t('skills.openingHours.title', 'Otváracie hodiny')}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="w-4 h-4 text-gray-600 dark:text-gray-400"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implementovať otvorenie recenzií
                          }}
                          className="mt-0 xl:mt-0.5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
                        >
                          <span>{t('skills.allReviews', 'Všetky recenzie')}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="w-5 h-5 text-gray-600 dark:text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
                            />
                          </svg>
                        </button>
                        <div className="mt-0 xl:mt-0 flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                        {offer.tags && offer.tags.length > 0 && (
                          <div className="mt-0 xl:mt-0.5 flex flex-wrap gap-1">
                            {offer.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      </div>
                      <FlipButton extraClasses="z-30" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeHoursOfferId && hoursPopoverPosition && activeOpeningHours &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] bg-black/40 sm:bg-black/20"
              onClick={() => {
                setActiveHoursOfferId(null);
                setHoursPopoverPosition(null);
                setActiveOpeningHours(null);
              }}
            />
            <div
              data-opening-hours-popover
              className="fixed z-[9999] w-[calc(100vw-2rem)] max-w-xs sm:w-64 sm:max-w-xs rounded-2xl bg-white dark:bg-[#050507] border border-gray-200/70 dark:border-gray-700/60 shadow-xl p-2.5 sm:p-3"
              style={{ top: hoursPopoverPosition.top, left: hoursPopoverPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-5 h-5 sm:w-4 sm:h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('skills.openingHours.title', 'Otváracie hodiny')}
                  </div>
                </div>
                {/* Tlačidlo na zatvorenie na mobile */}
                <button
                  onClick={() => {
                    setActiveHoursOfferId(null);
                    setHoursPopoverPosition(null);
                    setActiveOpeningHours(null);
                  }}
                  className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex-shrink-0"
                  aria-label="Zatvoriť"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="rounded-xl bg-gray-50/80 dark:bg-[#101012] border border-gray-200/70 dark:border-gray-700/60 px-3 sm:px-3 py-1.5 sm:py-2 max-h-20 sm:max-h-48 overflow-y-auto subtle-scrollbar">
                {HOURS_DAYS.map((day) => {
                  const data = activeOpeningHours[day.key];
                  if (!data || !data.enabled) return null;

                  return (
                    <div
                      key={day.key}
                      className="flex items-center justify-between text-sm sm:text-xs text-gray-700 dark:text-gray-200 py-0.5 sm:py-0.5"
                    >
                      <span className="font-medium w-12 sm:w-10">{day.shortLabel}</span>
                      <span className="tabular-nums text-right">
                        {data.from || '—'} – {data.to || '—'}
                      </span>
                    </div>
                  );
                })}
                {!HOURS_DAYS.some((d) => {
                  const data = activeOpeningHours[d.key];
                  return data && data.enabled;
                }) && (
                  <div className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 text-center py-2 sm:py-1.5">
                    {t(
                      'skills.openingHours.empty',
                      'Otváracie hodiny zatiaľ nie sú nastavené alebo je prevádzka zatvorená.'
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.getElementById('app-root') ?? document.body
        )}
    </div>
  );
}


