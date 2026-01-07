'use client';
 
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, endpoints } from '../../../../lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileTab } from './profileTypes';
import type { Offer, ExperienceUnit } from './profileOffersTypes';
import { HOURS_DAYS } from './profileOffersTypes';
import type { OpeningHours } from '../skills/skillDescriptionModal/types';
import ProfileOfferCard from './ProfileOfferCard';

interface ProfileOffersSectionProps {
  activeTab: ProfileTab;
  accountType?: 'personal' | 'business';
  ownerUserId?: number;
  highlightedSkillId?: number | null;
}

export default function ProfileOffersSection({
  activeTab,
  accountType = 'personal',
  ownerUserId,
  highlightedSkillId,
}: ProfileOffersSectionProps) {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number | string>>(() => new Set());
  const [activeHoursOfferId, setActiveHoursOfferId] = useState<number | string | null>(null);
  const [hoursPopoverPosition, setHoursPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeOpeningHours, setActiveOpeningHours] = useState<OpeningHours | null>(null);
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);

  // Load offers when switching to 'offers' tab (desktop focus)
  useEffect(() => {
    if (activeTab !== 'offers') return;

    const load = async () => {
      try {
        const endpoint = ownerUserId
          ? endpoints.dashboard.userSkills(ownerUserId)
          : endpoints.skills.list;
        const { data } = await api.get(endpoint);
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
            is_seeking: s.is_seeking === true,
            urgency:
              typeof s.urgency === 'string' && s.urgency.trim() !== ''
                ? (s.urgency.trim() as 'low' | 'medium' | 'high' | '')
                : '',
            duration_type: s.duration_type || null,
          };
        });
        setOffers(mapped);
      } catch (error) {
        // silent - rate limiting or other errors
      }
    };

    void load();
  }, [activeTab, ownerUserId]);

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

  // Po načítaní ponúk a nastavení highlightedSkillId poscrolluj na danú kartu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!highlightedCardRef.current) return;

    try {
      highlightedCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // ignore scroll errors
    }
  }, [offers]);

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
            const cardId =
              offer.id ??
              `${offer.category || 'cat'}-${offer.subcategory || 'sub'}-${offer.description || 'desc'}`;
            const isFlipped = flippedCards.has(cardId);

            const handleToggleFlip = () => {
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
                (day) => day && (day as any).enabled,
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

            const isHighlighted = highlightedSkillId != null && offer.id === highlightedSkillId;

            return (
              <div
                key={offer.id}
                ref={isHighlighted ? highlightedCardRef : undefined}
                className="relative group"
              >
                <ProfileOfferCard
                  offer={offer}
                  accountType={accountType}
                  t={t}
                  isFlipped={isFlipped}
                  onToggleFlip={handleToggleFlip}
                  onOpenHoursClick={accountType === 'business' ? handleOpenHoursClick : undefined}
                  isHighlighted={isHighlighted}
                />
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


